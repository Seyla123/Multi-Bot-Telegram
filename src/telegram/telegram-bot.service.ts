import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TelegramBotService {
  constructor(
    private prisma: PrismaService,
  ) {}

  async getAllBots() {
    return this.prisma.telegramBot.findMany();
  }

  async getBot(id: number) {
    return this.prisma.telegramBot.findUnique({ where: { id } });
  }

  async createBot(data: { name: string; botToken: string; username?: string }) {
    const realBotId = data.botToken.split(':')[0];
    return this.prisma.telegramBot.create({
      data: {
        name: data.name,
        botToken: data.botToken,
        username: data.username,
        botId: realBotId,
      },
    });
  }

  async deleteBot(id: number) {
    return this.prisma.telegramBot.delete({ where: { id } });
  }
}
