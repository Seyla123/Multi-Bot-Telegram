import { Module } from '@nestjs/common';
import { ApiServicesController } from './api-services.controller';
import { ApiServicesService } from './api-services.service';
import { ClientSecretGuard } from './guards/client-secret.guard';
import { TelegramApiService } from './telegram/telegram-api.service';
import { SendMessageService } from './telegram/send-message.service';

/**
 * Self-contained module for the Secret-Authenticated Service API.
 *
 * Intentionally imports NOTHING from:
 *  - TelegramModule (BotManagerService, database bots)
 *  - ClientServiceModule (ApiTokenService, existing auth system)
 *  - PrismaModule (no database queries)
 *
 * ConfigModule is registered globally (isGlobal: true in AppModule),
 * so ConfigService is available without an explicit import here.
 */
@Module({
  controllers: [ApiServicesController],
  providers: [
    ClientSecretGuard,
    TelegramApiService,
    SendMessageService,
    ApiServicesService,
  ],
})
export class ApiServicesModule {}
