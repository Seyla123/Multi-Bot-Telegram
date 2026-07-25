import { Update, Ctx, Start, Command, On } from 'nestjs-telegraf';
import { Context } from 'telegraf';
import { UseGuards, Logger } from '@nestjs/common';
import { TelegramAuthGuard } from './guards/telegram-auth.guard';
import { TelegramFileService } from './telegram-file.service';
import { TelegramUserService } from './telegram-user.service';
import { TelegramMessageService } from './telegram-message.service';

@Update()
export class TelegramUpdate {
  private readonly logger = new Logger(TelegramUpdate.name);

  constructor(
    private readonly userService: TelegramUserService,
    private readonly messageService: TelegramMessageService,
    private readonly fileService: TelegramFileService,
  ) {}

  @Start()
  async onStart(@Ctx() ctx: Context) {
    await ctx.reply('Welcome! I am your secure NestJS bot.');
  }

  @UseGuards(TelegramAuthGuard)
  @Command('status')
  async onStatus(@Ctx() ctx: Context) {
    await ctx.reply('All systems are operational.');
  }

  @On('message')
  async onMessage(@Ctx() ctx: Context) {
    const message = ctx.message;
    if (!message) return;

    const from = message.from;
    if (!from) return;

    // 1. Delegate user creation/update
    const telegramUser = await this.userService.upsertUser(from);
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
      this.fileService
        .downloadAndSaveFile(parsedData.fileId)
        .then(async (filePath) => {
        if (filePath) {
          await this.messageService.updateMessageFilePath(
            savedMessage.id,
            filePath,
          );
        }
      });
    }
  }
}
