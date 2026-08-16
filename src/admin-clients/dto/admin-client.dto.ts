import { ApiTokenEnvironment, ApiTokenStatus, ApiTokenType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsDate, IsEnum, IsOptional, IsString, MaxLength, Min, IsInt } from 'class-validator';

export class AdminClientQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) limit = 20;
  @IsOptional() @IsString() search?: string;
  @IsOptional() @IsEnum(ApiTokenType) type?: ApiTokenType;
  @IsOptional() @IsEnum(ApiTokenStatus) status?: ApiTokenStatus;
  @IsOptional() @IsEnum(ApiTokenEnvironment) environment?: ApiTokenEnvironment;
}

export class CreateAdminClientDto {
  @IsString() @MaxLength(191) name: string;
  @IsEnum(ApiTokenType) type: ApiTokenType;
  @IsOptional() @IsEnum(ApiTokenEnvironment) environment?: ApiTokenEnvironment;
  @IsOptional() @IsString() @MaxLength(191) description?: string;
  @IsOptional() @IsString() userId?: string;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(50) permissions?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(50) allowedIps?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) rateLimitPerMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) dailyQuota?: number;
  @IsOptional() @Type(() => Date) @IsDate() expiresAt?: Date;
}

export class UpdateAdminClientDto {
  @IsOptional() @IsString() @MaxLength(191) name?: string;
  @IsOptional() @IsString() @MaxLength(191) description?: string | null;
  @IsOptional() @IsString() userId?: string | null;
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(50) permissions?: string[];
  @IsOptional() @IsArray() @IsString({ each: true }) @ArrayMaxSize(50) allowedIps?: string[];
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) rateLimitPerMin?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) dailyQuota?: number;
  @IsOptional() @Transform(({ value }) => value === null || value === '' ? null : new Date(value)) @IsDate() expiresAt?: Date | null;
}
