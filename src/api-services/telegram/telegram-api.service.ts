import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TelegramSendMessageResult {
  ok: boolean;
  result?: {
    message_id: number;
    chat: { id: number | string };
    [key: string]: unknown;
  };
  error_code?: number;
  description?: string;
}

/**
 * Low-level Telegram Bot API client for the Secret-Authenticated Service API.
 *
 * This service is intentionally independent from the existing BotManagerService
 * and database-managed bot system. It reads TELEGRAM_BOT_TOKEN directly from
 * the application configuration and uses Node's built-in fetch to call the
 * Telegram Bot API.
 *
 * IMPORTANT: The bot token is never logged.
 */
@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);
  private readonly apiBase: string;

  constructor(private readonly configService: ConfigService) {
    const token = this.configService.get<string>('TELEGRAM_BOT_TOKEN');
    if (!token) {
      throw new Error(
        'TELEGRAM_BOT_TOKEN is not configured — TelegramApiService cannot initialize',
      );
    }
    this.apiBase = `https://api.telegram.org/bot${token}`;
  }

  /**
   * Sends a text message to a Telegram chat.
   *
   * @param chatId - Telegram chat ID or @username string
   * @param text   - Message text (1–4096 characters)
   */
  async sendMessage(
    chatId: string,
    text: string,
  ): Promise<TelegramSendMessageResult> {
    const url = `${this.apiBase}/sendMessage`;
    this.logger.log(`Sending Telegram message to chat_id: ${chatId}`);

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text }),
        signal: AbortSignal.timeout(10_000), // 10 s network timeout
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      this.logger.error(`Telegram API network error: ${message}`);
      throw new Error(`Telegram API request failed: ${message}`);
    }

    const body = (await response.json()) as TelegramSendMessageResult;

    if (!response.ok || !body.ok) {
      this.logger.error(
        `Telegram API error — code: ${body.error_code}, description: ${body.description}`,
      );
    }

    return body;
  }
}
