import { BadRequestException } from '@nestjs/common';
import { ApiServicesService } from './api-services.service';
import { SendMessageService } from './telegram/send-message.service';
import type { ApiServiceRequestDto } from './dto/api-service-request.dto';

describe('ApiServicesService', () => {
  let service: ApiServicesService;
  let sendMessageService: jest.Mocked<SendMessageService>;

  beforeEach(() => {
    sendMessageService = {
      execute: jest.fn().mockResolvedValue({
        success: true,
        data: { message_id: 42, chat_id: '123456789' },
      }),
    } as unknown as jest.Mocked<SendMessageService>;

    service = new ApiServicesService(sendMessageService);
  });

  describe('send_message', () => {
    it('should delegate to SendMessageService', async () => {
      const dto: ApiServiceRequestDto = {
        service: 'send_message',
        chat_id: '123456789',
        message: 'Hello',
      };

      const result = await service.dispatch(dto);

      expect(sendMessageService.execute).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ success: true, data: { message_id: 42, chat_id: '123456789' } });
    });
  });

  describe('unsupported service', () => {
    it('should throw BadRequestException for unknown service name', async () => {
      const dto: ApiServiceRequestDto = {
        service: 'send_photo',
        chat_id: '123456789',
      };

      await expect(service.dispatch(dto)).rejects.toThrow(BadRequestException);
    });

    it('should include the service name in the error body', async () => {
      const dto: ApiServiceRequestDto = { service: 'unknown_service' };

      try {
        await service.dispatch(dto);
        fail('expected to throw');
      } catch (err: unknown) {
        const response = (err as BadRequestException).getResponse() as Record<string, unknown>;
        expect(response.success).toBe(false);
        expect(String(response.message)).toContain('unknown_service');
      }
    });
  });
});
