import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TelegramUserService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertUser(from: any, botId: number) {
    if (!from || !from.id) return null;
    
    return this.prisma.telegramUser.upsert({
      where: { 
        telegramId_botId: {
          telegramId: from.id.toString(),
          botId
        }
      },
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
        botId,
      },
    });
  }

  async getUserById(id: string) {
    return this.prisma.telegramUser.findUnique({ where: { id } });
  }

  async getUsers(page: number = 1, limit: number = 50, search?: string, botId?: number) {
    const skip = (page - 1) * limit;
    
    const whereClause: Prisma.TelegramUserWhereInput = {};
    if (botId !== undefined && botId !== null) {
      const parsedId = Number(botId);
      if (!isNaN(parsedId)) {
        whereClause.botId = parsedId;
      }
    }
    if (search) {
      whereClause.OR = [
        { firstName: { contains: search } },
        { lastName: { contains: search } },
        { username: { contains: search } },
        { telegramId: { contains: search } }
      ];
    }

    const [users, total] = await Promise.all([
      this.prisma.telegramUser.findMany({
        where: whereClause,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          _count: {
            select: { messages: { where: { status: 'unread' } } }
          },
          messages: {
            orderBy: { createdAt: 'desc' },
            take: 1
          }
        }
      }),
      this.prisma.telegramUser.count({ where: whereClause })
    ]);

    const mappedUsers = users.map(user => {
      const { _count, messages, ...rest } = user;
      return {
        ...rest,
        unreadCount: _count.messages,
        lastMessage: messages[0] || null
      };
    });

    return {
      data: mappedUsers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }
}
