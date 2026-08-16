import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

export class AdminCreateVideoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @IsString()
  @IsNotEmpty()
  originalFileName: string;

  @IsString()
  @IsOptional()
  status?: string;
}

export class AdminUpdateVideoDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  originalFileName?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
