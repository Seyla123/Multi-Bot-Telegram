import { IsString, IsOptional } from 'class-validator';

export class UpdateTelegramUserDto {
  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsString()
  @IsOptional()
  username?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsString()
  @IsOptional()
  status?: string;

  @IsString()
  @IsOptional()
  conversationStatus?: string;

  @IsString()
  @IsOptional()
  assignedAgentId?: string;
}
