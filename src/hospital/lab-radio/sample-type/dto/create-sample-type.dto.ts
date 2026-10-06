import { IsString, IsOptional, IsBoolean, IsUUID, IsInt, MaxLength, MinLength, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateSampleTypeDto {
  @ApiProperty({ example: 'Serum' })
  @IsString() @MinLength(1) @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ description: 'Sample container id' })
  @IsUUID()
  containerId: string;

  @ApiPropertyOptional({ example: 7, description: 'Sample retention in days' })
  @IsOptional() @Type(() => Number) @IsInt() @Min(0)
  archiveDays?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional() @IsBoolean()
  isActive?: boolean;
}
