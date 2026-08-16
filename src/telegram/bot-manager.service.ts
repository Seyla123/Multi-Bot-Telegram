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
  private allowedUserId?: string;
  private processedUpdates: Set<number> = new Set(); // Basic in-memory idempotency

  constructor(
    private readonly botService: TelegramBotService,
    private readonly userService: TelegramUserService,
    private readonly messageService: TelegramMessageService,
    private readonly fileService: TelegramFileService,
    private readonly configService: ConfigService,
  ) {}

  async onModuleInit() {
    this.allowedUserId = this.configService.get<string>('TELEGRAM_ALLOWED_USER_ID');
    
    // Safety check: Abort startup if Telegram mocking is enabled in a production environment
    const appEnv = this.configService.get<string>('APP_ENV');
    const nodeEnv = this.configService.get<string>('NODE_ENV');
    const isMockEnabled = this.configService.get<string>('TELEGRAM_MOCK') === 'true';

    if (isMockEnabled && (appEnv === 'production' || nodeEnv === 'production')) {
      const errorMsg = `FATAL CONFIGURATION ERROR: Outbound Telegram API mocking (TELEGRAM_MOCK=true) is NOT allowed in production mode (APP_ENV/NODE_ENV=production). Startup aborted for safety.`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

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

      const isMockEnabled = String(this.configService.get('TELEGRAM_MOCK') || 'false').toLowerCase() === 'true';
      if (isMockEnabled) {
        this.logger.log(`Mocking outbound Telegram Bot API calls for bot ${botId}`);
        bot.telegram.sendMessage = async (chatId, text, extra) => {
          this.logger.debug(`[MOCK TELEGRAM] sendMessage to ${chatId}: ${text}`);
          return {
            message_id: Math.round(Math.random() * 1000000),
            chat: { id: typeof chatId === 'string' ? parseInt(chatId, 10) || 123456789 : chatId, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            text
          } as any;
        };
        bot.telegram.sendPhoto = async (chatId, photo, extra) => {
          this.logger.debug(`[MOCK TELEGRAM] sendPhoto to ${chatId}`);
          return {
            message_id: Math.round(Math.random() * 1000000),
            chat: { id: typeof chatId === 'string' ? parseInt(chatId, 10) || 123456789 : chatId, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            photo: []
          } as any;
        };
        bot.telegram.sendVideo = async (chatId, video, extra) => {
          this.logger.debug(`[MOCK TELEGRAM] sendVideo to ${chatId}`);
          return {
            message_id: Math.round(Math.random() * 1000000),
            chat: { id: typeof chatId === 'string' ? parseInt(chatId, 10) || 123456789 : chatId, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            video: {}
          } as any;
        };
        bot.telegram.sendVoice = async (chatId, voice, extra) => {
          this.logger.debug(`[MOCK TELEGRAM] sendVoice to ${chatId}`);
          return {
            message_id: Math.round(Math.random() * 1000000),
            chat: { id: typeof chatId === 'string' ? parseInt(chatId, 10) || 123456789 : chatId, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            voice: {}
          } as any;
        };
        bot.telegram.sendDocument = async (chatId, doc, extra) => {
          this.logger.debug(`[MOCK TELEGRAM] sendDocument to ${chatId}`);
          return {
            message_id: Math.round(Math.random() * 1000000),
            chat: { id: typeof chatId === 'string' ? parseInt(chatId, 10) || 123456789 : chatId, type: 'private' },
            date: Math.floor(Date.now() / 1000),
            document: {}
          } as any;
        };
        bot.telegram.setWebhook = async (url, extra) => {
          this.logger.debug(`[MOCK TELEGRAM] setWebhook to ${url}`);
          return true;
        };
        bot.telegram.getFileLink = async (fileId) => {
          this.logger.debug(`[MOCK TELEGRAM] getFileLink for ${fileId}`);
          return new URL(`http://localhost:3000/mock-file/${fileId}`);
        };
      }

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
    if (!bot) {
      this.logger.warn(`Received update for unknown bot ${botId}`);
      return;
    }

    // Basic idempotency check for webhooks
    if (update.update_id) {
      if (this.processedUpdates.has(update.update_id)) {
        this.logger.debug(`Skipping already processed update ${update.update_id}`);
        return;
      }
      this.processedUpdates.add(update.update_id);
      // Clean up old updates to prevent memory leak (simple approach: keep only last 1000)
      if (this.processedUpdates.size > 1000) {
        const firstItem = this.processedUpdates.values().next().value;
        if (firstItem !== undefined) {
           this.processedUpdates.delete(firstItem);
        }
      }
    }

    await bot.handleUpdate(update);
  }

  async sendTextMessage(botId: number, telegramId: string, text: string) {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot instance not found or not running');
    return bot.telegram.sendMessage(telegramId, text);
  }

  async sendMediaMessage(botId: number, telegramId: string, text: string, file: Express.Multer.File) {
    const bot = this.bots.get(botId);
    if (!bot) throw new Error('Bot instance not found or not running');
    
    // Instead of buffer, we use the saved file path on disk (from multer diskStorage)
    // Create ReadStream to avoid loading the entire file into memory
    const fs = await import('fs');
    if (!fs.existsSync(file.path)) {
      throw new Error(`File not found at path: ${file.path}`);
    }
    const source = { source: fs.createReadStream(file.path), filename: file.originalname };
    const mimeType = file.mimetype || '';

    if (mimeType.startsWith('image/')) {
      return bot.telegram.sendPhoto(telegramId, source, { caption: text });
    } else if (mimeType.startsWith('video/')) {
      return bot.telegram.sendVideo(telegramId, source, { caption: text });
    } else if (mimeType.startsWith('audio/') || mimeType.includes('voice')) {
      return bot.telegram.sendVoice(telegramId, source, { caption: text });
    } else {
      return bot.telegram.sendDocument(telegramId, source, { caption: text });
    }
  }

  private setupBotListeners(bot: Telegraf, botId: number) {
    bot.start(async (ctx) => {
      await ctx.reply('Welcome! I am your secure NestJS bot.');
    });

    bot.command('status', async (ctx) => {
      if (this.allowedUserId && ctx.from?.id.toString() !== this.allowedUserId) {
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
