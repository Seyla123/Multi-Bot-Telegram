import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class SendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  bot_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  chat_id: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(4096)
  text: string;
}
