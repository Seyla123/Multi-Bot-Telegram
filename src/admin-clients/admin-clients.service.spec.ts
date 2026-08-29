import { Test, TestingModule } from '@nestjs/testing';
import { AdminClientsService } from './admin-clients.service';
import { PrismaService } from '../prisma/prisma.service';

describe('AdminClientsService (Sorting Tests)', () => {
  let service: AdminClientsService;
  let prisma: {
    apiToken: { findMany: jest.Mock; count: jest.Mock; findUnique: jest.Mock };
  };

  beforeEach(async () => {
    prisma = {
      apiToken: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
        findUnique: jest.fn().mockResolvedValue(null),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminClientsService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AdminClientsService>(AdminClientsService);
  });

  it('should sort by name asc', async () => {
    await service.list({ sortBy: 'name', sortOrder: 'asc' } as any);
    expect(prisma.apiToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: 'asc' },
      }),
    );
  });

  it('should sort by environment desc', async () => {
    await service.list({ sortBy: 'environment', sortOrder: 'desc' } as any);
    expect(prisma.apiToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { environment: 'desc' },
      }),
    );
  });

  it('should sort by lastUsedAt desc', async () => {
    await service.list({ sortBy: 'lastUsedAt', sortOrder: 'desc' } as any);
    expect(prisma.apiToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { lastUsedAt: 'desc' },
      }),
    );
  });

  it('should fallback to createdAt desc on unknown/default', async () => {
    await service.list({ sortBy: 'unknown' } as any);
    expect(prisma.apiToken.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: 'desc' },
      }),
    );
  });
});
