import { IsString, IsNotEmpty, IsOptional, IsBoolean } from 'class-validator';

export class CreateBotDto {
  @IsString()
  @IsNotEmpty()
  botId: string;

  @IsString()
  @IsNotEmpty()
  botToken: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class UpdateBotDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsString()
  @IsOptional()
  botToken?: string;
}
