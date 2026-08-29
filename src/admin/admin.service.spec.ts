import { Test, TestingModule } from '@nestjs/testing';
import { AdminService } from './admin.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { BotManagerService } from '../telegram/bot-manager.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('AdminService (Sorting, CRUD & Webhook Tests)', () => {
  let service: AdminService;
  let prisma: {
    telegramBot: {
      findMany: jest.Mock;
      count: jest.Mock;
      findUnique: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
    };
    agent: { findMany: jest.Mock; count: jest.Mock };
    telegramUser: { findMany: jest.Mock; count: jest.Mock };
    telegramMessage: { findMany: jest.Mock; count: jest.Mock };
    video: { findMany: jest.Mock; count: jest.Mock };
  };
  let configService: { get: jest.Mock };
  let botManagerService: {
    getBot: jest.Mock;
    startBot: jest.Mock;
    stopBot: jest.Mock;
  };
  let mockTelegraf: {
    telegram: {
      setWebhook: jest.Mock;
      getWebhookInfo: jest.Mock;
      deleteWebhook: jest.Mock;
    };
  };

  beforeEach(async () => {
    mockTelegraf = {
      telegram: {
        setWebhook: jest.fn().mockResolvedValue(true),
        getWebhookInfo: jest.fn().mockResolvedValue({
          url: 'https://example.com/telegram/webhook/1',
          has_custom_certificate: false,
          pending_update_count: 0,
        }),
        deleteWebhook: jest.fn().mockResolvedValue(true),
      },
    };

    prisma = {
      telegramBot: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockResolvedValue({
            id: 1,
            botId: '123',
            name: 'Bot',
            isActive: true,
            botToken: 'tok:123',
          }),
        update: jest
          .fn()
          .mockResolvedValue({
            id: 1,
            botId: '123',
            name: 'Bot',
            isActive: true,
            botToken: 'tok:123',
          }),
        delete: jest.fn().mockResolvedValue({ id: 1 }),
      },
      agent: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      telegramUser: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      telegramMessage: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      video: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    configService = {
      get: jest.fn((key: string) => {
        if (key === 'TELEGRAM_WEBHOOK_DOMAIN') return 'https://api.domain.com';
        if (key === 'TELEGRAM_WEBHOOK_SECRET') return 'secret_token_123';
        return undefined;
      }),
    };

    botManagerService = {
      getBot: jest.fn().mockReturnValue(mockTelegraf),
      startBot: jest.fn().mockResolvedValue(undefined),
      stopBot: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminService,
        { provide: PrismaService, useValue: prisma },
        { provide: ConfigService, useValue: configService },
        { provide: BotManagerService, useValue: botManagerService },
      ],
    }).compile();

    service = module.get<AdminService>(AdminService);
  });

  describe('listBots sorting', () => {
    it('should sort by botId asc', async () => {
      await service.listBots({ sortBy: 'botId', sortOrder: 'asc' });
      expect(prisma.telegramBot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { botId: 'asc' },
        }),
      );
    });

    it('should sort by isActive when status/isActive is requested', async () => {
      await service.listBots({ sortBy: 'status', sortOrder: 'desc' });
      expect(prisma.telegramBot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { isActive: 'desc' },
        }),
      );
    });

    it('should fallback to createdAt desc on unknown/default field', async () => {
      await service.listBots({ sortBy: 'unknownField' as any });
      expect(prisma.telegramBot.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  describe('listAgents sorting', () => {
    it('should sort by name asc', async () => {
      await service.listAgents({ sortBy: 'name', sortOrder: 'asc' });
      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { name: 'asc' },
        }),
      );
    });

    it('should sort by role when role/status is passed', async () => {
      await service.listAgents({ sortBy: 'role', sortOrder: 'desc' });
      expect(prisma.agent.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { role: 'desc' },
        }),
      );
    });
  });

  describe('listTelegramUsers sorting', () => {
    it('should map name to [firstName, lastName]', async () => {
      await service.listTelegramUsers({ sortBy: 'name', sortOrder: 'asc' });
      expect(prisma.telegramUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
        }),
      );
    });

    it('should map bot to relation bot.name', async () => {
      await service.listTelegramUsers({ sortBy: 'bot', sortOrder: 'asc' });
      expect(prisma.telegramUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { bot: { name: 'asc' } },
        }),
      );
    });

    it('should map agent to relation assignedAgent.name', async () => {
      await service.listTelegramUsers({ sortBy: 'agent', sortOrder: 'desc' });
      expect(prisma.telegramUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { assignedAgent: { name: 'desc' } },
        }),
      );
    });

    it('should sort by conversationStatus', async () => {
      await service.listTelegramUsers({
        sortBy: 'conversationStatus',
        sortOrder: 'asc',
      });
      expect(prisma.telegramUser.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { conversationStatus: 'asc' },
        }),
      );
    });
  });

  describe('listTelegramMessages sorting', () => {
    it('should safely map direction to agentId', async () => {
      await service.listTelegramMessages({
        sortBy: 'direction',
        sortOrder: 'asc',
      });
      expect(prisma.telegramMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { agentId: 'asc' },
        }),
      );
    });

    it('should sort by messageType and messageId', async () => {
      await service.listTelegramMessages({
        sortBy: 'messageType',
        sortOrder: 'desc',
      });
      expect(prisma.telegramMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { messageType: 'desc' },
        }),
      );

      await service.listTelegramMessages({
        sortBy: 'messageId',
        sortOrder: 'asc',
      });
      expect(prisma.telegramMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { messageId: 'asc' },
        }),
      );
    });

    it('should map user/telegramUser to relation telegramUser.firstName', async () => {
      await service.listTelegramMessages({
        sortBy: 'telegramUser',
        sortOrder: 'asc',
      });
      expect(prisma.telegramMessage.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { telegramUser: { firstName: 'asc' } },
        }),
      );
    });
  });

  describe('listVideos sorting', () => {
    it('should map name to title', async () => {
      await service.listVideos({ sortBy: 'name', sortOrder: 'asc' });
      expect(prisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { title: 'asc' },
        }),
      );
    });

    it('should sort by originalFileName', async () => {
      await service.listVideos({
        sortBy: 'originalFileName',
        sortOrder: 'desc',
      });
      expect(prisma.video.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { originalFileName: 'desc' },
        }),
      );
    });
  });

  describe('setBotWebhook', () => {
    it('should set webhook successfully for active bot', async () => {
      prisma.telegramBot.findUnique.mockResolvedValue({
        id: 10,
        botId: 'bot10',
        name: 'SupportBot',
        username: 'support_bot',
        botToken: '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',
        isActive: true,
      });

      const res = await service.setBotWebhook(10);

      expect(res.success).toBe(true);
      expect(res.data.botId).toBe(10);
      expect(res.data.webhookUrl).toBe(
        'https://api.domain.com/telegram/webhook/10',
      );
      expect(res.data.hasSecretToken).toBe(true);
      expect(mockTelegraf.telegram.setWebhook).toHaveBeenCalledWith(
        'https://api.domain.com/telegram/webhook/10',
        { secret_token: 'secret_token_123' },
      );
    });

    it('should throw 404 when bot is not found', async () => {
      prisma.telegramBot.findUnique.mockResolvedValue(null);
      await expect(service.setBotWebhook(999)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw 400 when bot is inactive', async () => {
      prisma.telegramBot.findUnique.mockResolvedValue({
        id: 2,
        name: 'InactiveBot',
        botToken: 'tok:123',
        isActive: false,
      });
      await expect(service.setBotWebhook(2)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw 400 when TELEGRAM_WEBHOOK_DOMAIN is missing', async () => {
      prisma.telegramBot.findUnique.mockResolvedValue({
        id: 3,
        name: 'ActiveBot',
        botToken: 'tok:123',
        isActive: true,
      });
      configService.get.mockImplementation((k: string) => {
        if (k === 'TELEGRAM_WEBHOOK_DOMAIN') return undefined;
        return undefined;
      });

      await expect(service.setBotWebhook(3)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw 400 with safe error message when Telegram API fails', async () => {
      prisma.telegramBot.findUnique.mockResolvedValue({
        id: 4,
        name: 'FailedBot',
        botToken: 'tok:123',
        isActive: true,
      });
      configService.get.mockReturnValue('https://api.domain.com');
      mockTelegraf.telegram.setWebhook.mockRejectedValue(
        new Error('Bad Request: bad webhook URL'),
      );

      await expect(service.setBotWebhook(4)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should maintain multi-bot isolation and use bot-specific token/id', async () => {
      prisma.telegramBot.findUnique.mockImplementation(
        async ({ where }: any) => {
          if (where.id === 1) {
            return {
              id: 1,
              botId: 'bot1',
              name: 'BotA',
              botToken: 'token_A',
              isActive: true,
            };
          }
          if (where.id === 2) {
            return {
              id: 2,
              botId: 'bot2',
              name: 'BotB',
              botToken: 'token_B',
              isActive: true,
            };
          }
          return null;
        },
      );

      configService.get.mockReturnValue('https://api.domain.com');

      const res1 = await service.setBotWebhook(1);
      expect(res1.data.botId).toBe(1);
      expect(res1.data.webhookUrl).toBe(
        'https://api.domain.com/telegram/webhook/1',
      );

      const res2 = await service.setBotWebhook(2);
      expect(res2.data.botId).toBe(2);
      expect(res2.data.webhookUrl).toBe(
        'https://api.domain.com/telegram/webhook/2',
      );
    });
  });

  describe('getBotWebhookInfo and deleteBotWebhook', () => {
    it('should return webhook info for a bot', async () => {
      prisma.telegramBot.findUnique.mockResolvedValue({
        id: 1,
        name: 'TestBot',
        botToken: 'tok:123',
        isActive: true,
      });

      const res = await service.getBotWebhookInfo(1);
      expect(res.success).toBe(true);
      expect(res.data.webhookConfigured).toBe(true);
      expect(res.data.info.url).toBe('https://example.com/telegram/webhook/1');
    });

    it('should delete webhook for a bot', async () => {
      prisma.telegramBot.findUnique.mockResolvedValue({
        id: 1,
        name: 'TestBot',
        botToken: 'tok:123',
        isActive: true,
      });

      const res = await service.deleteBotWebhook(1);
      expect(res.success).toBe(true);
      expect(mockTelegraf.telegram.deleteWebhook).toHaveBeenCalled();
    });
  });
});
