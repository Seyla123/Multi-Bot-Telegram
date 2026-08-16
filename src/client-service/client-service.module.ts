import { Module } from '@nestjs/common';
import { TelegramModule } from '../telegram/telegram.module';
import { ApiTokenService } from './api-token.service';
import { ClientServiceController } from './client-service.controller';
import { ClientServiceRegistry } from './client-service.registry';
import { ApiTokenStrategy } from './strategies/api-token.strategy';
import { SendMessageService } from './services/send-message.service';
import { CLIENT_SERVICE_HANDLERS } from './client-service.types';
import { GatewaySecurityGuard } from './guards/gateway-security.guard';
import { ApiAuditLogInterceptor } from './interceptors/api-audit-log.interceptor';

@Module({
  imports: [TelegramModule],
  controllers: [ClientServiceController],
  providers: [
    ApiTokenService,
    ApiTokenStrategy,
    GatewaySecurityGuard,
    ApiAuditLogInterceptor,
    ClientServiceRegistry,
    SendMessageService,
    {
      provide: CLIENT_SERVICE_HANDLERS,
      useFactory: (sendMessage: SendMessageService) => [sendMessage],
      inject: [SendMessageService],
    },
  ],
  exports: [ApiTokenService],
})
export class ClientServiceModule {}
