import {
  IsUUID,
  IsOptional,
  IsString,
  IsBoolean,
  IsInt,
  IsArray,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Bulk bed generator — "Create 10 beds in GW-1, bed numbers 101-110".
 * Either provide `bedNumbers` explicitly, or `count` + `startNumber` +
 * optional `prefix` to auto-generate.
 */
export class BulkCreateBedsDto {
  @ApiProperty({ description: 'Parent room id' })
  @IsUUID()
  roomId: string;

  @ApiPropertyOptional({
    example: ['101', '102', '103'],
    description: 'Explicit list of bed numbers (takes precedence over count)',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  bedNumbers?: string[];

  @ApiPropertyOptional({ example: 10, description: 'Number of beds to generate' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  count?: number;

  @ApiPropertyOptional({ example: 101, description: 'Starting number for auto-generation' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  startNumber?: number;

  @ApiPropertyOptional({
    example: 'B-',
    description: 'Optional prefix prepended to generated bed numbers',
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Transform(({ value }) => value?.trim())
  prefix?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isCount?: boolean;

  @ApiPropertyOptional({ description: 'Amenity ids to attach to every bed' })
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  amenityIds?: string[];
}
