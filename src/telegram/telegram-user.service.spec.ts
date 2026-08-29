import { Test, TestingModule } from '@nestjs/testing';
import { TelegramUserService } from './telegram-user.service';
import { PrismaService } from '../prisma/prisma.service';
import { PusherService } from '../pusher/pusher.service';

describe('TelegramUserService (getUsers Sorting Tests)', () => {
  let service: TelegramUserService;
  let prisma: {
    telegramUser: { findMany: jest.Mock; count: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      telegramUser: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramUserService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: PusherService,
          useValue: {
            triggerNewMessage: jest.fn(),
            triggerMessagesRead: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<TelegramUserService>(TelegramUserService);
  });

  it('should sort by lastName asc when requested', async () => {
    await service.getUsers(
      1,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      'lastName',
      'asc',
    );
    expect(prisma.telegramUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { lastName: 'asc' },
      }),
    );
  });

  it('should sort by firstName desc when requested', async () => {
    await service.getUsers(
      1,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      'firstName',
      'desc',
    );
    expect(prisma.telegramUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { firstName: 'desc' },
      }),
    );
  });

  it('should sort by name mapping to [firstName, lastName]', async () => {
    await service.getUsers(
      1,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      'name',
      'asc',
    );
    expect(prisma.telegramUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: [{ firstName: 'asc' }, { lastName: 'asc' }],
      }),
    );
  });

  it('should sort by createdAt desc when requested', async () => {
    await service.getUsers(
      1,
      10,
      undefined,
      undefined,
      undefined,
      undefined,
      'createdAt',
      'desc',
    );
    expect(prisma.telegramUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });

  it('should fallback to updatedAt desc by default', async () => {
    await service.getUsers(1, 10);
    expect(prisma.telegramUser.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { updatedAt: 'desc' },
      }),
    );
  });
});
