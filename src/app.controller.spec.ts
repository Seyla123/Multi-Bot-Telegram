import { Test, TestingModule } from '@nestjs/testing';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { EmailsService } from './emails/emails.service';

describe('AppController', () => {
  let appController: AppController;

  const mockEmailsService = {
    sendWelcomeEmail: jest
      .fn()
      .mockResolvedValue({ message: 'Email job dispatched successfully' }),
  };

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [AppController],
      providers: [
        AppService,
        {
          provide: EmailsService,
          useValue: mockEmailsService,
        },
      ],
    }).compile();

    appController = app.get<AppController>(AppController);
  });

  describe('root', () => {
    it('should return "Hello World!"', () => {
      expect(appController.getHello()).toBe('Hello World!');
    });
  });
});
