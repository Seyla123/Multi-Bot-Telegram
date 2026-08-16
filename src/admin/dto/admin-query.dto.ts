import { IsOptional, IsInt, IsString, Min, Max, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class AdminQueryDto {
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
  limit?: number = 20;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'updatedAt', 'name', 'email', 'title', 'telegramId', 'id'])
  sortBy?: string = 'createdAt';

  @IsOptional()
  @IsString()
  @IsIn(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  conversationStatus?: string;

  @IsOptional()
  @IsString()
  botId?: string;

  @IsOptional()
  @IsString()
  agentId?: string;

  @IsOptional()
  @IsString()
  messageType?: string;
}
