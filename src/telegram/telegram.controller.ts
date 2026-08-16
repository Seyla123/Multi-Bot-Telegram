import {
  Controller, Get, Post, Body, Param, UseInterceptors, UploadedFile,
  Query, Delete, ParseIntPipe, Headers, UseGuards, Req,
  HttpException, HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ConfigService } from '@nestjs/config';
import { TelegramUserService } from './telegram-user.service';
import { TelegramMessageService } from './telegram-message.service';
import { BotManagerService } from './bot-manager.service';
import { TelegramBotService } from './telegram-bot.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('telegram')
export class TelegramController {
  constructor(
    private readonly telegramUserService: TelegramUserService,
    private readonly telegramMessageService: TelegramMessageService,
    private readonly botManagerService: BotManagerService,
    private readonly telegramBotService: TelegramBotService,
    private readonly configService: ConfigService,
  ) { }

  // --- API Endpoints for Bots ---

  @Get('bots')
  async getBots() {
    const bots = await this.telegramBotService.getAllBots();
    return { data: bots };
  }

  @Get('set-webhooks')
  async setWebhooks() {
    const domain = this.configService.get<string>('TELEGRAM_WEBHOOK_DOMAIN');
    if (!domain) {
      return { success: false, message: 'TELEGRAM_WEBHOOK_DOMAIN not set in .env' };
    }
    const secretToken = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');

    const bots = await this.telegramBotService.getAllBots();

    const promises = bots.map(async (bot) => {
      if (!bot.isActive) return { name: bot.name, success: false, message: 'Bot inactive' };

      const telegraf = this.botManagerService.getBot(bot.id);
      if (!telegraf) return { name: bot.name, success: false, message: 'Bot instance not found' };

      const webhookUrl = `${domain}/telegram/webhook/${bot.id}`;
      try {
        await telegraf.telegram.setWebhook(webhookUrl, {
          secret_token: secretToken,
        });
        return { name: bot.name, success: true, url: webhookUrl };
      } catch (error: any) {
        return { name: bot.name, success: false, message: error.message };
      }
    });

    const resultsSettled = await Promise.allSettled(promises);
    const results = resultsSettled.map(r => r.status === 'fulfilled' ? r.value : { name: 'Unknown', success: false, message: 'Promise rejected' });

    return { success: true, data: results };
  }

  // Webhook is intentionally public — no JwtAuthGuard
  @Post('webhook/:botId')
  async handleWebhook(
    @Param('botId', ParseIntPipe) botId: number,
    @Body() update: any,
    @Headers('x-telegram-bot-api-secret-token') providedToken?: string,
  ) {
    const secretToken = this.configService.get<string>('TELEGRAM_WEBHOOK_SECRET');
    if (secretToken && providedToken !== secretToken) {
      return { success: false, message: 'Unauthorized webhook request' };
    }
    await this.botManagerService.handleUpdate(botId, update);
    return { success: true };
  }

  @Post('bots')
  async createBot(@Body() body: { name: string; botToken: string; username?: string }) {
    try {
      const bot = await this.telegramBotService.createBot(body);
      await this.botManagerService.startBot(bot.id, bot.botToken);
      return { success: true, data: bot };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  @Delete('bots/:id')
  async deleteBot(@Param('id', ParseIntPipe) id: number) {
    try {
      await this.botManagerService.stopBot(id);
      await this.telegramBotService.deleteBot(id);
      return { success: true };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  // --- API Endpoints for Frontend ---

  @UseGuards(JwtAuthGuard)
  @Get('users')
  async getUsers(
    @Req() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('botId') botId?: string,
    @Query('filter') filter?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    const botIdNum = botId ? parseInt(botId, 10) : undefined;
    const agentId = req.user?.id;
    return this.telegramUserService.getUsers(pageNum, limitNum, search, botIdNum, filter, agentId);
  }

  @UseGuards(JwtAuthGuard)
  @Get('messages/:userId')
  async getMessages(
    @Param('userId') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limitNum = limit ? parseInt(limit, 10) : 50;
    return this.telegramMessageService.getMessages(userId, pageNum, limitNum);
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages/:userId/read')
  async markAsRead(@Param('userId') userId: string) {
    return this.telegramMessageService.markAsRead(userId);
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages/:userId')
  @UseInterceptors(FileInterceptor('file'))
  async sendMessage(
    @Param('userId') userId: string,
    @Body('text') text: string,
    @Body('telegramId') telegramId: string,
    @Req() req: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    const agentId = req.user?.id;
    if (!text && !file) {
      return { success: false, message: 'Text or file is required' };
    }
    if (!telegramId) {
      return { success: false, message: 'telegramId is required' };
    }

    try {
      const user = await this.telegramUserService.getUserById(userId);
      if (!user || !user.botId) {
        return { success: false, message: 'User not found or not associated with any bot' };
      }

      const bot = this.botManagerService.getBot(user.botId);
      if (!bot) {
        return { success: false, message: 'Bot instance not found or not running' };
      }

      let sentMsg: any;
      let messageType = 'text';
      let filePath: string | undefined = undefined;

      if (file) {
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

        const source = { source: file.buffer, filename: file.originalname };
        const mimeType = file.mimetype || '';

        if (mimeType.startsWith('image/')) {
          messageType = 'photo';
          sentMsg = await bot.telegram.sendPhoto(telegramId, source, { caption: text });
        } else if (mimeType.startsWith('video/')) {
          messageType = 'video';
          sentMsg = await bot.telegram.sendVideo(telegramId, source, { caption: text });
        } else if (mimeType.startsWith('audio/') || mimeType.includes('voice')) {
          messageType = 'voice';
          sentMsg = await bot.telegram.sendVoice(telegramId, source, { caption: text });
        } else {
          messageType = 'document';
          sentMsg = await bot.telegram.sendDocument(telegramId, source, { caption: text });
        }
      } else {
        sentMsg = await bot.telegram.sendMessage(telegramId, text);
      }

      let savedMsg: any;
      if (file) {
        savedMsg = await this.telegramMessageService.saveOutgoingMediaMessage(
          userId,
          text || '',
          sentMsg.message_id.toString(),
          messageType,
          filePath!,
          agentId
        );
      } else {
        savedMsg = await this.telegramMessageService.saveOutgoingMessage(
          userId,
          text,
          sentMsg.message_id.toString(),
          agentId
        );
      }

      return { success: true, data: savedMsg };
    } catch (error: any) {
      return { success: false, message: error.message };
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages/:id/pin')
  async togglePin(@Param('id') id: string) {
    return this.telegramMessageService.togglePin(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('messages/:id/delete')
  async deleteMessage(@Param('id') id: string) {
    return this.telegramMessageService.deleteMessage(id);
  }

  // --- Conversation Assignment Endpoints ---

  @UseGuards(JwtAuthGuard)
  @Post('users/:id/assign')
  async assignConversation(@Param('id') id: string, @Req() req: any) {
    try {
      const data = await this.telegramUserService.assignConversation(id, req.user.id);
      return { success: true, data };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ success: false, message: error.message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/:id/unassign')
  async unassignConversation(@Param('id') id: string, @Req() req: any) {
    try {
      const data = await this.telegramUserService.unassignConversation(id, req.user.id);
      return { success: true, data };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ success: false, message: error.message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/:id/resolve')
  async resolveConversation(@Param('id') id: string, @Req() req: any) {
    try {
      const data = await this.telegramUserService.resolveConversation(id, req.user.id);
      return { success: true, data };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ success: false, message: error.message }, status);
    }
  }

  @UseGuards(JwtAuthGuard)
  @Post('users/:id/reopen')
  async reopenConversation(@Param('id') id: string, @Req() req: any) {
    try {
      const data = await this.telegramUserService.reopenConversation(id, req.user.id);
      return { success: true, data };
    } catch (error: any) {
      const status = error.status || HttpStatus.INTERNAL_SERVER_ERROR;
      throw new HttpException({ success: false, message: error.message }, status);
    }
  }
}
