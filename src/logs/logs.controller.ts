import { Controller, Get, Param, Query } from '@nestjs/common';
import { SystemLogsService } from './system-logs.service';

@Controller('logs')
export class LogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Get()
  getLogFiles() {
    return this.systemLogsService.getAvailableLogFiles();
  }

  @Get(':filename')
  async getLogContent(@Param('filename') filename: string, @Query('limit') limit?: number) {
    const result = await this.systemLogsService.getSystemLogs({
      file: filename,
      limit: limit ? Number(limit) : 100,
    });
    return result.data;
  }
}
