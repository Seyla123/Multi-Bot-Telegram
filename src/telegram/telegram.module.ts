import { Module } from '@nestjs/common';
import { TelegramUpdate } from './telegram.update';
import { TelegramController } from './telegram.controller';
import { TelegramFileService } from './telegram-file.service';
import { TelegramUserService } from './telegram-user.service';
import { TelegramMessageService } from './telegram-message.service';

@Module({
  controllers: [TelegramController],
  providers: [
    TelegramUpdate, 
    TelegramFileService,
    TelegramUserService,
    TelegramMessageService,
  ],
})
export class TelegramModule {}
