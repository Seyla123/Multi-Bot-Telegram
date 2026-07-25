import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
} from '@nestjs/common';
import { TelegrafExecutionContext } from 'nestjs-telegraf';
import { ConfigService } from '@nestjs/config';
import { Context } from 'telegraf';

@Injectable()
export class TelegramAuthGuard implements CanActivate {
  private readonly logger = new Logger(TelegramAuthGuard.name);

  constructor(private configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const ctx = TelegrafExecutionContext.create(context);
    const telegrafCtx = ctx.getContext<Context>();
    const allowedUserId = this.configService.get<string>(
      'TELEGRAM_ALLOWED_USER_ID',
    );

    if (!allowedUserId) {
      this.logger.warn(
        'TELEGRAM_ALLOWED_USER_ID is not set! Denying all access to bot.',
      );
      return false;
    }

    const userId = telegrafCtx.from?.id;
    return userId?.toString() === allowedUserId;
  }
}
