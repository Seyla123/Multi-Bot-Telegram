import { Type } from 'class-transformer';
import { IsNotEmpty, IsObject, IsString, MaxLength } from 'class-validator';

export class ClientServiceRequestDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  service: string;

  @IsObject()
  @Type(() => Object)
  payload: Record<string, unknown>;
}
