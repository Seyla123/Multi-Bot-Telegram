import { Test, TestingModule } from '@nestjs/testing';
import { SystemLogsController } from './system-logs.controller';
import { SystemLogsService } from './system-logs.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SystemLogsController', () => {
  let controller: SystemLogsController;
  let service: SystemLogsService;

  const mockSystemLogsService = {
    getSystemLogs: jest.fn().mockResolvedValue({
      data: [{ id: 'test.log:1', timestamp: '2026-08-22T00:00:00Z', level: 'info', message: 'Test message' }],
      meta: { page: 1, limit: 50, total: 1, totalPages: 1, hasNextPage: false, hasPrevPage: false, file: 'test.log', availableFiles: ['test.log'] },
    }),
    getAvailableLogFiles: jest.fn().mockReturnValue(['test.log', 'error.log']),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemLogsController],
      providers: [
        { provide: SystemLogsService, useValue: mockSystemLogsService },
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    controller = module.get<SystemLogsController>(SystemLogsController);
    service = module.get<SystemLogsService>(SystemLogsService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should return system logs', async () => {
    const result = await controller.getSystemLogs({ page: 1, limit: 50 });
    expect(result).toHaveProperty('data');
    expect(result.data.length).toBe(1);
    expect(service.getSystemLogs).toHaveBeenCalledWith({ page: 1, limit: 50 });
  });

  it('should return available log files', () => {
    const files = controller.getAvailableFiles();
    expect(files).toEqual(['test.log', 'error.log']);
    expect(service.getAvailableLogFiles).toHaveBeenCalled();
  });
});
