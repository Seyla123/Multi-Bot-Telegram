import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

/**
 * Top-level DTO for POST /api/services.
 *
 * Only `service` is validated here. Service-specific fields (`chat_id`,
 * `message`, etc.) are validated inside the individual service handlers,
 * keeping this DTO generic and extensible.
 *
 * `chat_id` is declared as a string so large Telegram IDs and username handles
 * (e.g. "@mychannel") are both handled without numeric precision concerns.
 */
export class ApiServiceRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  service: string;

  @IsString()
  @IsOptional()
  chat_id?: string;

  @IsString()
  @IsOptional()
  @IsNotEmpty()
  @MaxLength(4096)
  message?: string;
}
