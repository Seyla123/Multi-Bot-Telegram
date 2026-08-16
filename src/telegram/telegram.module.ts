import { Module } from '@nestjs/common';
import { TelegramController } from './telegram.controller';
import { TelegramFileService } from './telegram-file.service';
import { TelegramUserService } from './telegram-user.service';
import { TelegramMessageService } from './telegram-message.service';
import { BotManagerService } from './bot-manager.service';
import { TelegramBotService } from './telegram-bot.service';

@Module({
  controllers: [TelegramController],
  providers: [
    BotManagerService,
    TelegramBotService,
    TelegramFileService,
    TelegramUserService,
    TelegramMessageService,
  ],
  exports: [BotManagerService, TelegramMessageService],
})
export class TelegramModule {}
