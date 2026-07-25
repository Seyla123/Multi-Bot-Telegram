import { Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { InjectBot } from 'nestjs-telegraf';
import { Telegraf } from 'telegraf';

import { TelegramUserService } from './telegram-user.service';
import { TelegramMessageService } from './telegram-message.service';

@Controller('telegram')
export class TelegramController {
  constructor(
    @InjectBot() private readonly bot: Telegraf,
    private readonly configService: ConfigService,
    private readonly telegramUserService: TelegramUserService,
    private readonly telegramMessageService: TelegramMessageService,
  ) {}

  @Get('set-webhook')
  async setWebhook() {
    const domain = this.configService.get<string>('TELEGRAM_WEBHOOK_DOMAIN');
    if (!domain) {
      return {
        success: false,
        message: 'TELEGRAM_WEBHOOK_DOMAIN is not set in .env',
      };
    }

    const webhookUrl = `${domain}/telegram-webhook`;

    // In order for webhook to work, long polling needs to be stopped if it's running
    try {
      await this.bot.launch();
    } catch {
      // Ignore if it was already polling
    }

    await this.bot.telegram.setWebhook(webhookUrl);

    return {
      success: true,
      message: 'Webhook successfully set!',
      url: webhookUrl,
    };
  }

  @Get('remove-webhook')
  async removeWebhook() {
    // 1. Delete the webhook from Telegram
    await this.bot.telegram.deleteWebhook();

    // 2. Explicitly stop the bot so it doesn't fall back to long polling
    try {
      this.bot.stop();
    } catch {
      // Ignore errors
    }

    return {
      success: true,
      message:
        'Webhook removed. The bot is now completely STOPPED and will not respond to any messages.',
    };
  }

  // --- API Endpoints for Frontend ---

  @Get('users')
  async getUsers() {
    return this.telegramUserService.getUsers();
  }

  @Get('messages/:userId')
  async getMessages(@Param('userId') userId: string) {
    return this.telegramMessageService.getMessages(userId);
  }

  @Post('messages/:userId')
  @UseInterceptors(FileInterceptor('file'))
  async sendMessage(
    @Param('userId') userId: string,
    @Body('text') text: string,
    @Body('telegramId') telegramId: string,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!text && !file) {
      return { success: false, message: 'Text or file is required' };
    }
    if (!telegramId) {
      return { success: false, message: 'telegramId is required' };
    }

    try {
      let sentMsg: any;
      let messageType = 'text';
      let filePath: string | undefined = undefined;

      // 1. Send via Telegram Bot API
      if (file) {
        // Save file locally
        const fs = await import('fs');
        const path = await import('path');
        const storageDir = path.join(process.cwd(), 'storage', 'telegram_files');
        if (!fs.existsSync(storageDir)) {
          fs.mkdirSync(storageDir, { recursive: true });
        }
        const ext = path.extname(file.originalname);
        const filename = `${Date.now()}-${Math.round(Math.random() * 1E9)}${ext}`;
        const localFilePath = path.join(storageDir, filename);
        fs.writeFileSync(localFilePath, file.buffer);
        filePath = `storage/telegram_files/${filename}`;

        // Send to Telegram
        const source = { source: file.buffer, filename: file.originalname };
        const mimeType = file.mimetype || '';

        if (mimeType.startsWith('image/')) {
          messageType = 'photo';
          sentMsg = await this.bot.telegram.sendPhoto(telegramId, source, { caption: text });
        } else if (mimeType.startsWith('video/')) {
          messageType = 'video';
          sentMsg = await this.bot.telegram.sendVideo(telegramId, source, { caption: text });
        } else if (mimeType.startsWith('audio/') || mimeType.includes('voice')) {
          messageType = 'voice';
          sentMsg = await this.bot.telegram.sendVoice(telegramId, source, { caption: text });
        } else {
          messageType = 'document';
          sentMsg = await this.bot.telegram.sendDocument(telegramId, source, { caption: text });
        }
      } else {
        sentMsg = await this.bot.telegram.sendMessage(telegramId, text);
      }
      
      // 2. Save in database
      let savedMsg;
      if (file) {
        savedMsg = await this.telegramMessageService.saveOutgoingMediaMessage(
          userId,
          text || '',
          sentMsg.message_id.toString(),
          messageType,
          filePath!
        );
      } else {
        savedMsg = await this.telegramMessageService.saveOutgoingMessage(
          userId,
          text,
          sentMsg.message_id.toString(),
        );
      }
      
      return { success: true, data: savedMsg };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  @Post('messages/:id/pin')
  async togglePin(@Param('id') id: string) {
    return this.telegramMessageService.togglePin(id);
  }

  @Post('messages/:id/delete')
  async deleteMessage(@Param('id') id: string) {
    return this.telegramMessageService.deleteMessage(id);
  }
}
