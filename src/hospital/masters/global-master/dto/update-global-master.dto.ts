import { IsString, IsOptional, IsInt, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';

export class UpdateGlobalMasterDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  value?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}