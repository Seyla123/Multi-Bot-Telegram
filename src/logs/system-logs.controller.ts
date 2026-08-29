import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
  UseGuards,
  Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../admin/guards/admin.guard';
import { SystemLogsService } from './system-logs.service';
import { SystemLogsQueryDto } from './dto/system-logs-query.dto';

@Controller('api/admin/system-logs')
@UseGuards(JwtAuthGuard, AdminGuard)
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Get()
  getSystemLogs(@Query() query: SystemLogsQueryDto) {
    return this.systemLogsService.getSystemLogs(query);
  }

  @Get('files')
  getAvailableFiles() {
    return this.systemLogsService.getAvailableLogFiles();
  }

  @Get('files/:fileId/entries')
  getFileEntries(@Param('fileId') fileId: string, @Query() query: SystemLogsQueryDto) {
    return this.systemLogsService.getSystemLogs({ ...query, file: fileId });
  }

  @Get('files/:fileId/entries/:entryId')
  getLogEntryDetail(@Param('fileId') fileId: string, @Param('entryId') entryId: string) {
    return this.systemLogsService.getLogEntryById(fileId, entryId);
  }

  @Get('files/:fileId/download')
  downloadLogFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const { stream, fileName, size } = this.systemLogsService.getLogFileDownload(fileId);

    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Content-Disposition': `attachment; filename="${fileName}"`,
      'Content-Length': size,
    });

    stream.pipe(res);
  }

  @Delete('files/:fileId')
  deleteLogFile(@Param('fileId') fileId: string) {
    return this.systemLogsService.deleteLogFile(fileId);
  }
}
