import { CanActivate, ExecutionContext, Injectable, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AgentRole } from '@prisma/client';

@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const user = request.user; // populated by JwtAuthGuard

    if (!user || !user.id) {
      throw new UnauthorizedException('Authentication required');
    }

    const agent = await this.prisma.agent.findUnique({
      where: { id: user.id },
      select: { role: true },
    });

    if (!agent || agent.role !== AgentRole.ADMIN) {
      throw new ForbiddenException('Forbidden resource: Administrator privileges required');
    }

    return true;
  }
}
