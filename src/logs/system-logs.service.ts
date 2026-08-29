import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
} from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import {
  SystemLogsQueryDto,
  SystemLogEntry,
  SystemLogsResponse,
  LogFileMeta,
} from './dto/system-logs-query.dto';

@Injectable()
export class SystemLogsService {
  private readonly logsDir = path.join(process.cwd(), 'storage', 'logs');

  /**
   * Human readable byte formatter
   */
  private formatBytes(bytes: number, decimals: number = 1): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  /**
   * Returns list of safe log files with file metadata (size, last modified, type)
   */
  getAvailableLogFiles(): LogFileMeta[] {
    try {
      if (!fs.existsSync(this.logsDir)) {
        return [];
      }
      const files = fs.readdirSync(this.logsDir);
      const logFiles = files
        .filter((f) => f.endsWith('.log') && !f.startsWith('.'))
        .sort((a, b) => b.localeCompare(a));

      return logFiles.map((name) => {
        const fullPath = path.join(this.logsDir, name);
        let size = 0;
        let modifiedAt = new Date().toISOString();

        try {
          const stat = fs.statSync(fullPath);
          size = stat.size;
          modifiedAt = stat.mtime.toISOString();
        } catch {
          // Fallback if stat fails
        }

        let type: 'application' | 'error' | 'general' = 'general';
        if (name.startsWith('error')) {
          type = 'error';
        } else if (name.startsWith('application') || name.startsWith('app')) {
          type = 'application';
        }

        return {
          id: name,
          name,
          size,
          formattedSize: this.formatBytes(size),
          modifiedAt,
          type,
        };
      });
    } catch (error: any) {
      throw new InternalServerErrorException(`Failed to read log directory: ${error.message}`);
    }
  }

  /**
   * Sanitizes and validates a requested log filename against directory traversal attacks
   */
  public resolveSafeLogPath(requestedFilename?: string): { filePath: string; fileName: string } {
    const rawInput = requestedFilename ? requestedFilename.trim() : '';

    if (rawInput && (rawInput.includes('..') || rawInput.includes('/') || rawInput.includes('\\'))) {
      throw new ForbiddenException('Invalid log file path.');
    }

    const availableFiles = this.getAvailableLogFiles();
    if (availableFiles.length === 0) {
      throw new NotFoundException('No log files available on server.');
    }

    const targetFilename = rawInput ? path.basename(rawInput) : availableFiles[0].name;

    if (!targetFilename.endsWith('.log')) {
      throw new BadRequestException('Log file must have a .log extension.');
    }

    const resolvedPath = path.resolve(this.logsDir, targetFilename);

    // Strictly ensure resolved path is within logsDir
    if (!resolvedPath.startsWith(path.resolve(this.logsDir))) {
      throw new ForbiddenException('Access to file outside storage/logs is prohibited.');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new NotFoundException(`Log file "${targetFilename}" does not exist.`);
    }

    return { filePath: resolvedPath, fileName: targetFilename };
  }

  /**
   * Mask sensitive tokens, Bearer JWTs, passwords, and client secrets
   */
  redactSensitiveData(text: string): string {
    if (!text || typeof text !== 'string') return text;

    return text
      // Redact Telegram Bot Tokens: bot123456789:ABCDefgh-1234567890abcdef
      .replace(/(\b\d{6,14}:[A-Za-z0-9_-]{20,50}\b)/g, (match) => {
        const parts = match.split(':');
        return parts.length === 2 ? `${parts[0]}:********************` : '********************';
      })
      // Redact Bearer tokens / JWTs
      .replace(/(Bearer\s+)[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+/gi, '$1[REDACTED_JWT]')
      // Redact JSON passwords / secrets
      .replace(/("(?:password|pass|secret|clientSecret|botToken)"\s*:\s*)"(?:[^"\\]|\\.)*"/gi, '$1"[REDACTED]"')
      // Redact Authorization headers
      .replace(/("(?:authorization|Authorization)"\s*:\s*)"(?:[^"\\]|\\.)*"/gi, '$1"[REDACTED]"');
  }

  /**
   * Recursively redacts sensitive keys in metadata objects
   */
  private redactObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
      return obj.map((item) => (typeof item === 'string' ? this.redactSensitiveData(item) : this.redactObject(item)));
    }

    const redacted: Record<string, any> = {};
    const sensitiveKeyPatterns = /password|secret|token|authorization|credential|cookie/i;

    for (const [key, value] of Object.entries(obj)) {
      if (sensitiveKeyPatterns.test(key) && typeof value === 'string') {
        redacted[key] = '[REDACTED]';
      } else if (typeof value === 'string') {
        redacted[key] = this.redactSensitiveData(value);
      } else if (typeof value === 'object' && value !== null) {
        redacted[key] = this.redactObject(value);
      } else {
        redacted[key] = value;
      }
    }

    return redacted;
  }

  /**
   * Stream reads and parses a log file line by line with memory bounds, filtering, and pagination
   */
  async getSystemLogs(query: SystemLogsQueryDto): Promise<SystemLogsResponse> {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 50));
    const levelFilter = (query.level || 'all').toLowerCase();
    const searchTerm = (query.search || '').trim().toLowerCase();

    const { filePath, fileName } = this.resolveSafeLogPath(query.file);
    const availableFiles = this.getAvailableLogFiles();

    const matchedLogs: SystemLogEntry[] = [];
    const levelCounts: Record<string, number> = {
      all: 0,
      error: 0,
      warn: 0,
      info: 0,
      debug: 0,
    };

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let lineNumber = 0;

    for await (const rawLine of rl) {
      lineNumber++;
      const line = rawLine.trim();
      if (!line) continue;

      let entry: SystemLogEntry;

      try {
        const parsed = JSON.parse(line);
        const rawLevel = String(parsed.level || 'info').toLowerCase();

        // Increment level counts
        levelCounts.all = (levelCounts.all || 0) + 1;
        levelCounts[rawLevel] = (levelCounts[rawLevel] || 0) + 1;

        // Level matching
        if (levelFilter !== 'all' && rawLevel !== levelFilter && !(levelFilter === 'warn' && rawLevel === 'warning')) {
          continue;
        }

        const rawMessage = typeof parsed.message === 'string' ? parsed.message : JSON.stringify(parsed.message || '');
        const rawContext = parsed.context ? String(parsed.context) : undefined;
        const rawStack = parsed.stack ? (Array.isArray(parsed.stack) ? parsed.stack.join('\n') : String(parsed.stack)) : undefined;

        // Search matching across message, context, and stack
        if (searchTerm) {
          const matchTarget = `${rawMessage} ${rawContext || ''} ${rawStack || ''} ${JSON.stringify(parsed)}`.toLowerCase();
          if (!matchTarget.includes(searchTerm)) {
            continue;
          }
        }

        // Build redacted entry
        const { level, timestamp, message, context, stack, ...restMetadata } = parsed;
        entry = {
          id: `${fileName}:${lineNumber}`,
          timestamp: timestamp || new Date().toISOString(),
          level: rawLevel,
          message: this.redactSensitiveData(rawMessage),
          context: rawContext ? this.redactSensitiveData(rawContext) : undefined,
          stack: rawStack ? this.redactSensitiveData(rawStack) : undefined,
          hasStackTrace: Boolean(rawStack),
          metadata: Object.keys(restMetadata).length > 0 ? this.redactObject(restMetadata) : undefined,
        };
      } catch {
        // Plaintext unparsed log line fallback
        const rawLevel = 'unknown';
        levelCounts.all = (levelCounts.all || 0) + 1;

        if (levelFilter !== 'all') {
          continue;
        }

        if (searchTerm && !line.toLowerCase().includes(searchTerm)) {
          continue;
        }

        entry = {
          id: `${fileName}:${lineNumber}`,
          timestamp: new Date().toISOString(),
          level: rawLevel,
          message: this.redactSensitiveData(line),
        };
      }

      matchedLogs.push(entry);
    }

    // Sort newest logs first
    matchedLogs.reverse();

    const total = matchedLogs.length;
    const totalPages = Math.ceil(total / limit) || 1;
    const offset = (page - 1) * limit;
    const paginatedData = matchedLogs.slice(offset, offset + limit);

    return {
      data: paginatedData,
      meta: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        file: fileName,
        availableFiles,
        levelCounts,
      },
    };
  }

  /**
   * Fetch single log entry by identifier
   */
  async getLogEntryById(fileId: string, entryId: string): Promise<SystemLogEntry> {
    const { filePath, fileName } = this.resolveSafeLogPath(fileId);
    const targetLineNumber = parseInt(entryId.split(':').pop() || '', 10);

    if (isNaN(targetLineNumber) || targetLineNumber < 1) {
      throw new BadRequestException('Invalid log entry identifier format.');
    }

    const fileStream = fs.createReadStream(filePath, { encoding: 'utf8' });
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity,
    });

    let currentLine = 0;

    for await (const rawLine of rl) {
      currentLine++;
      if (currentLine === targetLineNumber) {
        const line = rawLine.trim();
        try {
          const parsed = JSON.parse(line);
          const { level, timestamp, message, context, stack, ...restMetadata } = parsed;
          return {
            id: `${fileName}:${currentLine}`,
            timestamp: timestamp || new Date().toISOString(),
            level: String(level || 'info').toLowerCase(),
            message: this.redactSensitiveData(typeof message === 'string' ? message : JSON.stringify(message)),
            context: context ? this.redactSensitiveData(String(context)) : undefined,
            stack: stack ? this.redactSensitiveData(Array.isArray(stack) ? stack.join('\n') : String(stack)) : undefined,
            hasStackTrace: Boolean(stack),
            metadata: Object.keys(restMetadata).length > 0 ? this.redactObject(restMetadata) : undefined,
          };
        } catch {
          return {
            id: `${fileName}:${currentLine}`,
            timestamp: new Date().toISOString(),
            level: 'unknown',
            message: this.redactSensitiveData(line),
          };
        }
      }
    }

    throw new NotFoundException(`Log entry ${entryId} not found in ${fileName}.`);
  }

  /**
   * Returns a readable stream for file download
   */
  getLogFileDownload(fileId: string): { stream: fs.ReadStream; fileName: string; size: number } {
    const { filePath, fileName } = this.resolveSafeLogPath(fileId);
    const stat = fs.statSync(filePath);
    const stream = fs.createReadStream(filePath);
    return { stream, fileName, size: stat.size };
  }

  /**
   * Delete or clear a log file
   */
  deleteLogFile(fileId: string): { success: boolean; message: string } {
    const { filePath, fileName } = this.resolveSafeLogPath(fileId);
    try {
      fs.unlinkSync(filePath);
      return { success: true, message: `Log file "${fileName}" deleted successfully.` };
    } catch (error: any) {
      throw new InternalServerErrorException(`Failed to delete log file: ${error.message}`);
    }
  }
}
