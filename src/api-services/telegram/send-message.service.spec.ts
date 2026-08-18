import { BadRequestException } from '@nestjs/common';
import { SendMessageService } from './send-message.service';
import { TelegramApiService } from './telegram-api.service';
import type { ApiServiceRequestDto } from '../dto/api-service-request.dto';

describe('SendMessageService', () => {
  let service: SendMessageService;
  let telegramApi: jest.Mocked<TelegramApiService>;

  const successfulTelegramResponse = {
    ok: true,
    result: {
      message_id: 999,
      chat: { id: 123456789 },
    },
  };

  beforeEach(() => {
    telegramApi = {
      sendMessage: jest.fn().mockResolvedValue(successfulTelegramResponse),
    } as unknown as jest.Mocked<TelegramApiService>;

    service = new SendMessageService(telegramApi);
  });

  describe('validation', () => {
    it('should throw 400 when chat_id is missing', async () => {
      const dto: ApiServiceRequestDto = { service: 'send_message', message: 'Hello' };
      await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw 400 when chat_id is empty string', async () => {
      const dto: ApiServiceRequestDto = { service: 'send_message', chat_id: '   ', message: 'Hello' };
      await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw 400 when message is missing', async () => {
      const dto: ApiServiceRequestDto = { service: 'send_message', chat_id: '123456789' };
      await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw 400 when message is empty string', async () => {
      const dto: ApiServiceRequestDto = { service: 'send_message', chat_id: '123456789', message: '' };
      await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw 400 when message is only whitespace', async () => {
      const dto: ApiServiceRequestDto = { service: 'send_message', chat_id: '123456789', message: '   ' };
      await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
    });

    it('should throw 400 when message exceeds 4096 characters', async () => {
      const dto: ApiServiceRequestDto = {
        service: 'send_message',
        chat_id: '123456789',
        message: 'x'.repeat(4097),
      };
      await expect(service.execute(dto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('successful send', () => {
    it('should return success with message_id and chat_id', async () => {
      const dto: ApiServiceRequestDto = {
        service: 'send_message',
        chat_id: '123456789',
        message: 'Hello from API',
      };

      const result = await service.execute(dto);

      expect(result).toEqual({
        success: true,
        data: { message_id: 999, chat_id: '123456789' },
      });
    });

    it('should call TelegramApiService with chat_id and message text', async () => {
      const dto: ApiServiceRequestDto = {
        service: 'send_message',
        chat_id: '123456789',
        message: 'Hello from API',
      };

      await service.execute(dto);

      expect(telegramApi.sendMessage).toHaveBeenCalledWith('123456789', 'Hello from API');
    });

    it('should work with a @username chat_id', async () => {
      const dto: ApiServiceRequestDto = {
        service: 'send_message',
        chat_id: '@mychannel',
        message: 'Broadcast message',
      };

      const result = await service.execute(dto);

      expect(telegramApi.sendMessage).toHaveBeenCalledWith('@mychannel', 'Broadcast message');
      expect(result).toMatchObject({ success: true });
    });
  });

  describe('Telegram API errors', () => {
    it('should return success: false when Telegram returns ok: false', async () => {
      telegramApi.sendMessage.mockResolvedValue({
        ok: false,
        error_code: 400,
        description: 'Bad Request: chat not found',
      });

      const dto: ApiServiceRequestDto = {
        service: 'send_message',
        chat_id: '999',
        message: 'Hello',
      };

      const result = await service.execute(dto);

      expect(result).toEqual({
        success: false,
        message: 'Failed to send Telegram message',
        error: { code: 400, description: 'Bad Request: chat not found' },
      });
    });

    it('should return success: false on network/timeout errors', async () => {
      telegramApi.sendMessage.mockRejectedValue(new Error('network timeout'));

      const dto: ApiServiceRequestDto = {
        service: 'send_message',
        chat_id: '123456789',
        message: 'Hello',
      };

      const result = await service.execute(dto);

      expect(result).toMatchObject({ success: false });
    });
  });
});
