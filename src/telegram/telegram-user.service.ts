import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramUserService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertUser(from: any) {
    if (!from || !from.id) return null;
    
    return this.prisma.telegramUser.upsert({
      where: { telegramId: from.id.toString() },
      update: {
        firstName: from.first_name,
        lastName: from.last_name || null,
        username: from.username || null,
      },
      create: {
        telegramId: from.id.toString(),
        firstName: from.first_name,
        lastName: from.last_name || null,
        username: from.username || null,
      },
    });
  }
  async getUsers() {
    return this.prisma.telegramUser.findMany({
      orderBy: { updatedAt: 'desc' },
    });
  }
}
