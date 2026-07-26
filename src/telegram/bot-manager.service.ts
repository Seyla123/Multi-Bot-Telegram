import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { Telegraf } from 'telegraf';
import { TelegramBotService } from './telegram-bot.service';
import { TelegramUserService } from './telegram-user.service';
import { TelegramMessageService } from './telegram-message.service';
import { TelegramFileService } from './telegram-file.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BotManagerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(BotManagerService.name);
  private bots: Map<number, Telegraf> = new Map();

  constructor(
    private readonly botService: TelegramBotService,
    private readonly userService: TelegramUserService,
    private readonly messageService: TelegramMessageService,
    private readonly fileService: TelegramFileService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    await this.initializeBots();
  }

  async onModuleDestroy() {
    for (const [id, bot] of this.bots.entries()) {
      try {
        bot.stop();
        this.logger.log(`Stopped bot ${id}`);
      } catch (err) {
        this.logger.error(`Error stopping bot ${id}:`, err);
      }
    }
  }

  async initializeBots() {
    const bots = await this.botService.getAllBots();
    for (const botConfig of bots) {
      if (botConfig.isActive) {
        await this.startBot(botConfig.id, botConfig.botToken);
      }
    }
  }

  async startBot(botId: number, botToken: string) {
    if (this.bots.has(botId)) {
      this.logger.warn(`Bot ${botId} is already running.`);
      return;
    }

    try {
      const bot = new Telegraf(botToken);
      this.setupBotListeners(bot, botId);

      // We don't launch polling here anymore, we rely on webhooks
      this.bots.set(botId, bot);
      this.logger.log(`Bot ${botId} initialized successfully.`);
    } catch (error) {
      this.logger.error(`Failed to start bot ${botId}:`, error);
    }
  }

  async stopBot(botId: number) {
    const bot = this.bots.get(botId);
    if (bot) {
      bot.stop();
      this.bots.delete(botId);
      this.logger.log(`Bot ${botId} stopped.`);
    }
  }

  getBot(botId: number): Telegraf | undefined {
    return this.bots.get(botId);
  }

  async handleUpdate(botId: number, update: any) {
    const bot = this.bots.get(botId);
    if (bot) {
      // Create a dummy res object since Telegraf's handleUpdate expects one, but we just need it to process the body
      await bot.handleUpdate(update);
    } else {
      this.logger.warn(`Received update for unknown bot ${botId}`);
    }
  }

  private setupBotListeners(bot: Telegraf, botId: number) {
    bot.start(async (ctx) => {
      await ctx.reply('Welcome! I am your secure NestJS bot.');
    });

    bot.command('status', async (ctx) => {
      const allowedUserId = this.configService.get<string>('TELEGRAM_ALLOWED_USER_ID');
      if (allowedUserId && ctx.from?.id.toString() !== allowedUserId) {
        return; // unauthorized
      }
      await ctx.reply('All systems are operational.');
    });

    bot.on('message', async (ctx) => {
      const message = ctx.message as any;
      if (!message) return;

      const from = message.from;
      if (!from) return;

      // 1. Delegate user creation/update (pass botId)
      const telegramUser = await this.userService.upsertUser(from, botId);
      if (!telegramUser) {
        this.logger.error(`Failed to upsert user ${from.id}`);
        return;
      }

      // 2. Delegate message parsing
      const parsedData = this.messageService.parseMessage(message);
      if (!parsedData) return; // Unsupported message type

      // 3. Delegate message saving
      const savedMessage = await this.messageService.saveMessage(
        telegramUser.id,
        message.message_id.toString(),
        parsedData,
      );

      // 4. Delegate file downloading asynchronously
      if (parsedData.fileId) {
        // We need the file url or use the bot instance to get the file link
        try {
          const fileLink = await ctx.telegram.getFileLink(parsedData.fileId);
          // Wait, fileService.downloadAndSaveFile might expect just fileId and use the globally injected bot.
          // But now we don't have a global bot!
          // We need to pass the fileLink or the bot instance to fileService.
          const filePath = await this.fileService.downloadAndSaveFileWithUrl(fileLink.toString(), parsedData.fileId);
          if (filePath) {
            await this.messageService.updateMessageFilePath(savedMessage.id, filePath);
          }
        } catch (err) {
          this.logger.error(`Failed to download file ${parsedData.fileId}:`, err);
        }
      }
    });
  }
}
