import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiTokenEnvironment, ApiTokenStatus, ApiTokenType } from '@prisma/client';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ClientTokenPrincipal } from './client-service.types';

@Injectable()
export class ApiTokenService {
  constructor(private readonly prisma: PrismaService) {}

  /** Return the plaintext value once; only its SHA-256 hash is persisted. */
  async createToken(input: {
    name: string;
    type: ApiTokenType;
    permissions?: string[];
    environment?: ApiTokenEnvironment;
    agentId?: string;
    expiresAt?: Date;
  }) {
    if (input.type === ApiTokenType.PERSONAL && !input.agentId) {
      throw new Error('Personal tokens require an agentId');
    }
    if (input.type === ApiTokenType.CLIENT && input.agentId) {
      throw new Error('Client tokens cannot be associated with an agentId');
    }

    const prefix = input.type === ApiTokenType.PERSONAL ? 'tg_pat' : 'tg_client';
    const plainTextToken = `${prefix}_${randomBytes(32).toString('base64url')}`;
    const token = await this.prisma.apiToken.create({
      data: {
        name: input.name,
        type: input.type,
        preview: this.preview(plainTextToken),
        permissions: input.permissions?.length ? input.permissions : ['*'],
        allowedIps: [], environment: input.environment ?? ApiTokenEnvironment.LIVE,
        agentId: input.agentId,
        expiresAt: input.expiresAt,
        tokenHash: this.hash(plainTextToken),
      },
    });

    return { token, plainTextToken };
  }

  async authenticate(plainTextToken: string): Promise<ClientTokenPrincipal> {
    const token = await this.prisma.apiToken.findUnique({
      where: { tokenHash: this.hash(plainTextToken) },
      include: {
        agent: { select: { id: true, name: true, email: true, role: true } },
      },
    });
    if (!token || token.status !== ApiTokenStatus.ACTIVE) {
      throw new UnauthorizedException('Invalid or expired API token');
    }
    if (token.expiresAt && token.expiresAt <= new Date()) {
      await this.prisma.apiToken.update({
        where: { id: token.id },
        data: { status: ApiTokenStatus.EXPIRED },
      });
      throw new UnauthorizedException('Invalid or expired API token');
    }

    await this.prisma.apiToken.update({
      where: { id: token.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      id: token.id,
      type: token.type,
      permissions: this.parsePermissions(token.permissions),
      allowedIps: this.parsePermissions(token.allowedIps),
      rateLimitPerMin: token.rateLimitPerMin,
      dailyQuota: token.dailyQuota,
      environment: token.environment,
      user: token.agent,
    };
  }

  private hash(value: string) {
    return createHash('sha256').update(value).digest('hex');
  }

  private parsePermissions(value: unknown): string[] {
    return Array.isArray(value) && value.every((ability) => typeof ability === 'string')
      ? value
      : [];
  }

  private preview(token: string) {
    return `${token.slice(0, 14)}...${token.slice(-4)}`;
  }
}
