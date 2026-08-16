import { CanActivate, ExecutionContext, Injectable, HttpException, HttpStatus, ForbiddenException } from '@nestjs/common';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClientTokenPrincipal } from '../client-service.types';

@Injectable()
export class GatewaySecurityGuard implements CanActivate {
  private readonly windows = new Map<string, number[]>();
  constructor(private readonly prisma: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request & { user: ClientTokenPrincipal }>();
    const auth = req.user; const ip = this.ip(req);
    if (auth.allowedIps.length && !auth.allowedIps.includes(ip)) throw new ForbiddenException('IP address is not allowed for this client');
    const now = Date.now(); const hits = (this.windows.get(auth.id) ?? []).filter(t => t > now - 60_000);
    if (hits.length >= auth.rateLimitPerMin) throw new HttpException('Rate limit exceeded', HttpStatus.TOO_MANY_REQUESTS);
    hits.push(now); this.windows.set(auth.id, hits);
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const today = await this.prisma.apiRequestLog.count({ where: { clientId: auth.id, createdAt: { gte: start } } });
    if (today >= auth.dailyQuota) throw new HttpException('Daily quota exceeded', HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
  private ip(req: Request) { const forwarded = req.headers['x-forwarded-for']; return (Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(',')[0] || req.ip || '').trim(); }
}
