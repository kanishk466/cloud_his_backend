import { IsString, IsOptional, IsBoolean, MaxLength, MinLength } from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateServiceItemTypeDto {
  @ApiProperty({ example: 'SERVICE' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Transform(({ value }) => value?.trim()?.toUpperCase())
  code: string;

  @ApiProperty({ example: 'Service' })
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isSystem?: boolean;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
