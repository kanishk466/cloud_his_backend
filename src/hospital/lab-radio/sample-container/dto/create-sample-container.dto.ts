import { IsString, IsOptional, IsBoolean, IsNumber, MaxLength, MinLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSampleContainerDto {
  @ApiProperty({ example: 'EDTA Tube' })
  @IsString() @MinLength(1) @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: 'Lavender' })
  @IsOptional() @IsString() @MaxLength(40)
  @Transform(({ value }) => value?.trim())
  color?: string;

  @ApiPropertyOptional({ example: 2.5 })
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  sampleQuantityMl?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
