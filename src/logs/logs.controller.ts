import { Controller, Get, Param, HttpException, HttpStatus } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Controller('logs')
export class LogsController {
  private readonly logsDir = path.join(process.cwd(), 'storage', 'logs');

  @Get()
  getLogFiles() {
    try {
      if (!fs.existsSync(this.logsDir)) {
        return [];
      }
      const files = fs.readdirSync(this.logsDir);
      // Filter out only .log files
      const logFiles = files.filter(f => f.endsWith('.log')).sort((a, b) => b.localeCompare(a)); // Descending so newer is first
      return logFiles;
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Get(':filename')
  getLogContent(@Param('filename') filename: string) {
    if (!filename.endsWith('.log')) {
      throw new HttpException('Invalid file type', HttpStatus.BAD_REQUEST);
    }

    const filePath = path.join(this.logsDir, filename);

    // Prevent directory traversal attacks
    if (!filePath.startsWith(this.logsDir)) {
      throw new HttpException('Invalid file path', HttpStatus.FORBIDDEN);
    }

    try {
      if (!fs.existsSync(filePath)) {
        throw new HttpException('File not found', HttpStatus.NOT_FOUND);
      }
      
      const content = fs.readFileSync(filePath, 'utf8');
      
      // Winston writes one JSON object per line. Let's parse it if possible so frontend gets an array.
      const lines = content.split('\n').filter(line => line.trim().length > 0);
      const parsedLogs: any[] = [];
      
      for (const line of lines) {
        try {
          parsedLogs.push(JSON.parse(line));
        } catch {
          // If a line is not valid JSON, wrap it in a mock object to keep structure consistent
          parsedLogs.push({ message: line, level: 'unknown' });
        }
      }
      
      return parsedLogs;
    } catch (error: any) {
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }
}
