import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateBankDto {
  @ApiProperty({ example: 'HDFC Bank' })
  @IsString()
  @MinLength(1, { message: 'Bank name cannot be empty' })
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  bankName: string;

  @ApiPropertyOptional({
    example: 1.5,
    default: 0,
    description: 'MDR / bank cut percentage (0–100)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  mdrPercent?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
