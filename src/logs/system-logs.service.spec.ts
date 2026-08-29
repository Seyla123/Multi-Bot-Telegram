import { Test, TestingModule } from '@nestjs/testing';
import { SystemLogsService } from './system-logs.service';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

describe('SystemLogsService', () => {
  let service: SystemLogsService;
  const testLogsDir = path.join(process.cwd(), 'storage', 'logs');
  const testFileName = 'test-audit-sample.log';
  const testFilePath = path.join(testLogsDir, testFileName);

  beforeAll(() => {
    if (!fs.existsSync(testLogsDir)) {
      fs.mkdirSync(testLogsDir, { recursive: true });
    }

    const sampleLogLines = [
      JSON.stringify({
        timestamp: '2026-08-22T10:00:00.000Z',
        level: 'info',
        context: 'Bootstrap',
        message: 'Application started successfully with bot 123456789:ABCdefgh-1234567890abcdef',
      }),
      JSON.stringify({
        timestamp: '2026-08-22T10:05:00.000Z',
        level: 'warn',
        context: 'TelegramService',
        message: 'Rate limit approaching on chat 999',
      }),
      JSON.stringify({
        timestamp: '2026-08-22T10:10:00.000Z',
        level: 'error',
        context: 'HttpExceptionFilter',
        message: 'Authorization failed for Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgN_p_placeholder',
        stack: ['Error: Unauthorized\n    at AuthGuard.canActivate (/src/auth.ts:10:5)'],
      }),
    ].join('\n');

    fs.writeFileSync(testFilePath, sampleLogLines, 'utf8');
  });

  afterAll(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
    if (fs.existsSync(testFilePath)) {
      try {
        fs.unlinkSync(testFilePath);
      } catch {
        // Ignore cleanup error
      }
    }
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemLogsService],
    }).compile();

    service = module.get<SystemLogsService>(SystemLogsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should list available log files with metadata', () => {
    const files = service.getAvailableLogFiles();
    expect(Array.isArray(files)).toBe(true);
    const found = files.find((f) => f.name === testFileName);
    expect(found).toBeDefined();
    expect(found?.size).toBeGreaterThan(0);
    expect(found?.formattedSize).toBeDefined();
  });

  it('should prevent directory traversal attacks', async () => {
    await expect(service.getSystemLogs({ file: '../package.json' })).rejects.toThrow(ForbiddenException);
    await expect(service.getSystemLogs({ file: '../../etc/passwd' })).rejects.toThrow(ForbiddenException);
    await expect(service.getSystemLogs({ file: '/etc/passwd.log' })).rejects.toThrow(ForbiddenException);
  });

  it('should reject files without .log extension', async () => {
    await expect(service.getSystemLogs({ file: 'somefile.txt' })).rejects.toThrow(BadRequestException);
  });

  it('should return 404 for non-existent log file', async () => {
    await expect(service.getSystemLogs({ file: 'non-existent-file-999.log' })).rejects.toThrow(NotFoundException);
  });

  it('should redact sensitive bot tokens and bearer JWTs', async () => {
    const result = await service.getSystemLogs({ file: testFileName });
    expect(result.data.length).toBe(3);

    const infoLog = result.data.find((l) => l.level === 'info');
    expect(infoLog?.message).toContain('123456789:********************');
    expect(infoLog?.message).not.toContain('ABCdefgh-1234567890abcdef');

    const errorLog = result.data.find((l) => l.level === 'error');
    expect(errorLog?.message).toContain('Bearer [REDACTED_JWT]');
  });

  it('should filter logs by level and calculate level counts', async () => {
    const errorResult = await service.getSystemLogs({ file: testFileName, level: 'error' });
    expect(errorResult.data.length).toBe(1);
    expect(errorResult.data[0].level).toBe('error');
    expect(errorResult.meta.levelCounts?.error).toBe(1);
    expect(errorResult.meta.levelCounts?.info).toBe(1);
  });

  it('should retrieve single log entry detail by ID', async () => {
    const entry = await service.getLogEntryById(testFileName, `${testFileName}:3`);
    expect(entry).toBeDefined();
    expect(entry.level).toBe('error');
    expect(entry.context).toBe('HttpExceptionFilter');
  });

  it('should prepare log file download stream', (done) => {
    const download = service.getLogFileDownload(testFileName);
    expect(download.fileName).toBe(testFileName);
    expect(download.stream).toBeDefined();
    download.stream.on('data', () => {});
    download.stream.on('end', () => {
      done();
    });
  });
});
