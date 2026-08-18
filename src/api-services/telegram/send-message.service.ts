import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { TelegramApiService } from './telegram-api.service';
import type { ApiServiceRequestDto } from '../dto/api-service-request.dto';

export interface SendMessageResult {
  success: true;
  data: {
    message_id: number;
    chat_id: string;
  };
}

export interface SendMessageError {
  success: false;
  message: string;
  error?: {
    code: number;
    description: string;
  };
}

export type SendMessageResponse = SendMessageResult | SendMessageError;

/**
 * Handles the `send_message` service action.
 *
 * Validates that the request carries `chat_id` and `message`, then delegates
 * to TelegramApiService. Never queries the database; always uses the configured
 * TELEGRAM_BOT_TOKEN.
 */
@Injectable()
export class SendMessageService {
  private readonly logger = new Logger(SendMessageService.name);

  constructor(private readonly telegramApi: TelegramApiService) {}

  async execute(dto: ApiServiceRequestDto): Promise<SendMessageResponse> {
    // Service-level validation of required fields
    if (!dto.chat_id || typeof dto.chat_id !== 'string' || !dto.chat_id.trim()) {
      throw new BadRequestException({
        success: false,
        message: 'chat_id is required and must be a non-empty string',
      });
    }

    if (!dto.message || !dto.message.trim()) {
      throw new BadRequestException({
        success: false,
        message: 'message is required and must be a non-empty string',
      });
    }

    if (dto.message.length > 4096) {
      throw new BadRequestException({
        success: false,
        message: 'message exceeds Telegram maximum length of 4096 characters',
      });
    }

    this.logger.log(
      `Executing send_message for chat_id: ${dto.chat_id}`,
    );

    let result: Awaited<ReturnType<TelegramApiService['sendMessage']>>;
    try {
      result = await this.telegramApi.sendMessage(dto.chat_id, dto.message);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Telegram API request failed';
      this.logger.error(`send_message failed: ${message}`);
      return {
        success: false,
        message: 'Failed to send Telegram message',
      };
    }

    if (!result.ok || !result.result) {
      return {
        success: false,
        message: 'Failed to send Telegram message',
        error: {
          code: result.error_code ?? 0,
          description: result.description ?? 'Unknown error',
        },
      };
    }

    return {
      success: true,
      data: {
        message_id: result.result.message_id,
        chat_id: dto.chat_id,
      },
    };
  }
}
