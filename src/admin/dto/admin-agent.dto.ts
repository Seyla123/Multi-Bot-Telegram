import { IsString, IsEmail, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { AgentRole } from '@prisma/client';

export class CreateAgentDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  @IsEnum(AgentRole)
  @IsOptional()
  role?: AgentRole;
}

export class UpdateAgentDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsEnum(AgentRole)
  @IsOptional()
  role?: AgentRole;
}
