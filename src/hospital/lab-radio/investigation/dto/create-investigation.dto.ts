import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsInt,
  MaxLength,
  MinLength,
  Min,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateInvestigationDto {
  @ApiProperty({ description: 'Lab department id' })
  @IsUUID()
  departmentId: string;

  @ApiProperty({ description: 'ServiceMaster id (commercial SKU)' })
  @IsUUID()
  serviceId: string;

  @ApiProperty({ example: 'Complete Blood Count' })
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  @Transform(({ value }) => value?.trim())
  name: string;

  @ApiProperty({ example: 'CBC' })
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  @Transform(({ value }) => value?.trim())
  code: string;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  printOrder?: number;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  printSeparate?: boolean;

  @ApiPropertyOptional({ example: 60, description: 'Turnaround time in minutes' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  turnaroundTimeMins?: number;

  @ApiPropertyOptional({ description: 'Sample type id' })
  @IsOptional()
  @IsUUID()
  sampleTypeId?: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isOutsourced?: boolean;

  @ApiPropertyOptional({ description: 'Outsource lab id (when outsourced)' })
  @IsOptional()
  @IsUUID()
  outsourceLabId?: string;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
