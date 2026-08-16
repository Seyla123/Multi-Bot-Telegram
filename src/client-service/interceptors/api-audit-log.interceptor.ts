import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { catchError, tap, throwError } from 'rxjs';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import type { ClientTokenPrincipal } from '../client-service.types';
@Injectable()
export class ApiAuditLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}
  intercept(context: ExecutionContext, next: CallHandler) {
    const req = context.switchToHttp().getRequest<Request & { user: ClientTokenPrincipal; body: { service?: string } }>(); const started = Date.now(); const ip = String(req.headers['x-forwarded-for'] || req.ip || '').split(',')[0].trim();
    const log = (statusCode: number, errorMessage?: string) => this.prisma.apiRequestLog.create({ data: { clientId: req.user.id, service: req.body.service || 'unknown', statusCode, latencyMs: Date.now() - started, ipAddress: ip || null, errorMessage } }).then(() => this.prisma.apiToken.update({ where: { id: req.user.id }, data: { lastUsedAt: new Date(), lastUsedIp: ip || null } }));
    return next.handle().pipe(tap(() => void log(200)), catchError((err) => { void log(err.status || 500, err.message); return throwError(() => err); }));
  }
}
