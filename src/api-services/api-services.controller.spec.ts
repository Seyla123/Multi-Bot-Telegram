import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { ApiServicesController } from './api-services.controller';
import { ApiServicesService } from './api-services.service';
import { ClientSecretGuard } from './guards/client-secret.guard';

describe('ApiServicesController', () => {
  let controller: ApiServicesController;
  let apiServicesService: jest.Mocked<ApiServicesService>;

  const VALID_SECRET = 'test-secret';

  beforeEach(async () => {
    apiServicesService = {
      dispatch: jest.fn().mockResolvedValue({
        success: true,
        data: { message_id: 1, chat_id: '123456789' },
      }),
    } as unknown as jest.Mocked<ApiServicesService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ApiServicesController],
      providers: [
        { provide: ApiServicesService, useValue: apiServicesService },
        {
          provide: ConfigService,
          useValue: { get: jest.fn().mockReturnValue(VALID_SECRET) },
        },
        Reflector,
        ClientSecretGuard,
      ],
    }).compile();

    controller = module.get<ApiServicesController>(ApiServicesController);
  });

  it('should delegate to ApiServicesService and return its result', async () => {
    const dto = { service: 'send_message', chat_id: '123456789', message: 'Hello' };
    const result = await controller.execute(dto);

    expect(apiServicesService.dispatch).toHaveBeenCalledWith(dto);
    expect(result).toEqual({ success: true, data: { message_id: 1, chat_id: '123456789' } });
  });

  it('should propagate BadRequestException from dispatcher', async () => {
    apiServicesService.dispatch.mockRejectedValue(
      new BadRequestException({ success: false, message: 'Unsupported service: foo' }),
    );

    await expect(
      controller.execute({ service: 'foo', chat_id: '123', message: 'Hi' }),
    ).rejects.toThrow(BadRequestException);
  });

  describe('ClientSecretGuard (integration)', () => {
    it('guard should reject requests with a missing Authorization header', () => {
      const configService = { get: jest.fn().mockReturnValue(VALID_SECRET) } as unknown as ConfigService;
      const guard = new ClientSecretGuard(configService);
      const context = {
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      } as any;

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });

    it('guard should reject requests with a wrong Bearer token', () => {
      const configService = { get: jest.fn().mockReturnValue(VALID_SECRET) } as unknown as ConfigService;
      const guard = new ClientSecretGuard(configService);
      const context = {
        switchToHttp: () => ({
          getRequest: () => ({ headers: { authorization: 'Bearer wrong' } }),
        }),
      } as any;

      expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    });
  });
});
