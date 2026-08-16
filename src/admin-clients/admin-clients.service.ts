import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ApiTokenStatus, ApiTokenType, Prisma } from '@prisma/client';
import { randomBytes, createHash } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAdminClientDto, AdminClientQueryDto, UpdateAdminClientDto } from './dto/admin-client.dto';

const safeSelect = {
  id: true, name: true, description: true, type: true, environment: true, preview: true, status: true, permissions: true, allowedIps: true, rateLimitPerMin: true, dailyQuota: true, lastUsedIp: true,
  agentId: true, expiresAt: true, lastUsedAt: true, createdAt: true, updatedAt: true,
  agent: { select: { id: true, name: true, email: true } },
} satisfies Prisma.ApiTokenSelect;

@Injectable()
export class AdminClientsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(query: AdminClientQueryDto) {
    const page = Math.max(1, query.page);
    const limit = Math.min(100, Math.max(1, query.limit));
    const where: Prisma.ApiTokenWhereInput = {
      ...(query.type ? { type: query.type } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.environment ? { environment: query.environment } : {}),
      ...(query.search ? { OR: [{ name: { contains: query.search } }, { preview: { contains: query.search } }] } : {}),
    };
    const [data, total] = await Promise.all([
      this.prisma.apiToken.findMany({ where, select: safeSelect, orderBy: { createdAt: 'desc' }, skip: (page - 1) * limit, take: limit }),
      this.prisma.apiToken.count({ where }),
    ]);
    return { data, meta: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  }

  async create(dto: CreateAdminClientDto) {
    await this.assertOwner(dto.type, dto.userId);
    const rawToken = this.newToken(dto.type);
    const data: Prisma.ApiTokenUncheckedCreateInput = {
      name: dto.name, description: dto.description, type: dto.type, environment: dto.environment, agentId: dto.type === ApiTokenType.PERSONAL ? dto.userId : null,
      permissions: dto.permissions?.length ? dto.permissions : ['*'], expiresAt: dto.expiresAt,
      tokenHash: this.hash(rawToken), preview: this.preview(rawToken),
      allowedIps: dto.allowedIps ?? [], rateLimitPerMin: dto.rateLimitPerMin, dailyQuota: dto.dailyQuota,
    };
    const client = await this.prisma.apiToken.create({ data, select: safeSelect });
    return { client, rawToken };
  }

  async update(id: string, dto: UpdateAdminClientDto) {
    const current = await this.find(id);
    if (dto.userId !== undefined) await this.assertOwner(current.type, dto.userId);
    return this.prisma.apiToken.update({ where: { id }, data: {
      ...(dto.name !== undefined ? { name: dto.name } : {}),
      ...(dto.description !== undefined ? { description: dto.description } : {}),
      ...(dto.permissions !== undefined ? { permissions: dto.permissions } : {}),
      ...(dto.expiresAt !== undefined ? { expiresAt: dto.expiresAt } : {}),
      ...(dto.userId !== undefined ? { agentId: dto.userId } : {}),
      ...(dto.allowedIps !== undefined ? { allowedIps: dto.allowedIps } : {}),
      ...(dto.rateLimitPerMin !== undefined ? { rateLimitPerMin: dto.rateLimitPerMin } : {}),
      ...(dto.dailyQuota !== undefined ? { dailyQuota: dto.dailyQuota } : {}),
    }, select: safeSelect });
  }

  async regenerate(id: string) {
    const current = await this.find(id);
    const rawToken = this.newToken(current.type);
    const client = await this.prisma.apiToken.update({ where: { id }, data: {
      tokenHash: this.hash(rawToken), preview: this.preview(rawToken), status: ApiTokenStatus.ACTIVE,
      lastUsedAt: null,
    }, select: safeSelect });
    return { client, rawToken };
  }

  async toggleRevoke(id: string) {
    const current = await this.find(id);
    const expired = !!current.expiresAt && current.expiresAt <= new Date();
    const status = current.status === ApiTokenStatus.REVOKED && !expired ? ApiTokenStatus.ACTIVE : ApiTokenStatus.REVOKED;
    return this.prisma.apiToken.update({ where: { id }, data: { status }, select: safeSelect });
  }

  async remove(id: string) {
    await this.find(id);
    await this.prisma.apiToken.delete({ where: { id } });
  }
  async logs(id: string, page = 1, limit = 30) {
    await this.find(id); const safeLimit = Math.min(100, Math.max(1, limit)); const safePage = Math.max(1, page);
    const where = { clientId: id }; const [data, total] = await Promise.all([
      this.prisma.apiRequestLog.findMany({ where, orderBy: { createdAt: 'desc' }, skip: (safePage - 1) * safeLimit, take: safeLimit }),
      this.prisma.apiRequestLog.count({ where }),
    ]); return { data, meta: { page: safePage, limit: safeLimit, total, totalPages: Math.ceil(total / safeLimit) } };
  }

  private async find(id: string) {
    const client = await this.prisma.apiToken.findUnique({ where: { id } });
    if (!client) throw new NotFoundException('API client not found');
    return client;
  }
  private async assertOwner(type: ApiTokenType, userId?: string | null) {
    if (type === ApiTokenType.CLIENT && userId) throw new BadRequestException('Client tokens cannot have a user');
    if (type === ApiTokenType.PERSONAL && !userId) throw new BadRequestException('Personal tokens require a user');
    if (userId && !await this.prisma.agent.findUnique({ where: { id: userId }, select: { id: true } })) throw new BadRequestException('Selected user was not found');
  }
  private newToken(type: ApiTokenType) { return `${type === ApiTokenType.CLIENT ? 'tg_client' : 'tg_pat'}_${randomBytes(32).toString('base64url')}`; }
  private hash(value: string) { return createHash('sha256').update(value).digest('hex'); }
  private preview(value: string) { return `${value.slice(0, 14)}...${value.slice(-4)}`; }
}
