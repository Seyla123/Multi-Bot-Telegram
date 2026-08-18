import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';

const UNAUTHORIZED = { success: false, message: 'Unauthorized' } as const;

/**
 * Guards routes that require a static client secret supplied as a standard
 * Bearer token in the `Authorization` header:
 *
 *   Authorization: Bearer <CLIENT_SECRET>
 *
 * Validation uses `crypto.timingSafeEqual` to prevent timing-side-channel
 * attacks. The secret is never logged in any form.
 */
@Injectable()
export class ClientSecretGuard implements CanActivate {
  private readonly logger = new Logger(ClientSecretGuard.name);

  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const authHeader = req.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      this.logger.warn('Request rejected: Authorization header is missing');
      throw new UnauthorizedException(UNAUTHORIZED);
    }

    // Must be exactly "Bearer <token>" — any other scheme is rejected
    if (!authHeader.startsWith('Bearer ')) {
      this.logger.warn('Request rejected: Authorization header is not a Bearer token');
      throw new UnauthorizedException(UNAUTHORIZED);
    }

    const supplied = authHeader.slice('Bearer '.length).trim();
    if (!supplied) {
      this.logger.warn('Request rejected: Bearer token is empty');
      throw new UnauthorizedException(UNAUTHORIZED);
    }

    const expected = this.configService.get<string>('CLIENT_SECRET');
    if (!expected) {
      this.logger.error(
        'CLIENT_SECRET is not configured — cannot authenticate service requests',
      );
      throw new UnauthorizedException(UNAUTHORIZED);
    }

    if (!this.timingSafeCompare(supplied, expected)) {
      this.logger.warn('Request rejected: Bearer token is invalid');
      throw new UnauthorizedException(UNAUTHORIZED);
    }

    return true;
  }

  private timingSafeCompare(a: string, b: string): boolean {
    try {
      const bufA = Buffer.from(a);
      const bufB = Buffer.from(b);
      if (bufA.length !== bufB.length) return false;
      return timingSafeEqual(bufA, bufB);
    } catch {
      return false;
    }
  }
}
