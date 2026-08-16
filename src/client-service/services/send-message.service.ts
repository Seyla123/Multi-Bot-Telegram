import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validateOrReject } from 'class-validator';
import { BotManagerService } from '../../telegram/bot-manager.service';
import { TelegramMessageService } from '../../telegram/telegram-message.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from '../dto/send-message.dto';
import { ClientServiceContext, ClientServiceHandler } from '../client-service.types';

@Injectable()
export class SendMessageService implements ClientServiceHandler {
  readonly service = 'send_message';

  constructor(
    private readonly prisma: PrismaService,
    private readonly botManager: BotManagerService,
    private readonly messages: TelegramMessageService,
  ) {}

  async execute(payload: unknown, context: ClientServiceContext) {
    this.assertAbility(context);
    const input = plainToInstance(SendMessageDto, payload);
    await validateOrReject(input, { whitelist: true, forbidNonWhitelisted: true });

    const bot = await this.prisma.telegramBot.findFirst({
      where: { OR: [{ botId: input.bot_id }, { id: this.toDatabaseId(input.bot_id) }] },
    });
    if (!bot) throw new NotFoundException('Bot not found');

    const chat = await this.prisma.telegramUser.findUnique({
      where: { telegramId_botId: { telegramId: input.chat_id, botId: bot.id } },
    });
    if (!chat) throw new NotFoundException('Chat not found for this bot');

    const sent = await this.botManager.sendTextMessage(bot.id, input.chat_id, input.text);
    const message = await this.messages.saveOutgoingMessage(
      chat.id,
      input.text,
      sent.message_id.toString(),
      context.token.user?.id,
    );

    return { message, tokenType: context.token.type.toLowerCase() };
  }

  private assertAbility(context: ClientServiceContext) {
    if (!context.token.permissions.includes('*') && !context.token.permissions.includes(this.service)) {
      throw new ForbiddenException(`API token is not authorized for ${this.service}`);
    }
  }

  private toDatabaseId(value: string): number {
    return /^\d+$/.test(value) ? Number(value) : -1;
  }
}
