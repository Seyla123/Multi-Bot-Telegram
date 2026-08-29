import { IsOptional, IsInt, IsString, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class SystemLogsQueryDto {
  @IsOptional()
  @IsString()
  file?: string;

  @IsOptional()
  @IsString()
  @IsIn(['all', 'error', 'warn', 'warning', 'info', 'debug', 'verbose'])
  level?: string = 'all';

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 50;
}

export interface LogFileMeta {
  id: string;
  name: string;
  size: number;
  formattedSize: string;
  modifiedAt: string;
  type: 'application' | 'error' | 'general';
}

export interface SystemLogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
  context?: string;
  stack?: string | string[];
  metadata?: Record<string, any>;
  hasStackTrace?: boolean;
}

export interface SystemLogsResponse {
  data: SystemLogEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
    file: string;
    availableFiles: LogFileMeta[];
    levelCounts?: Record<string, number>;
  };
}
