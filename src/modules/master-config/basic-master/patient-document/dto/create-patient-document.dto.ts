import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  IsArray,
  MaxLength,
  MinLength,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentApplicableFor } from '@prisma/client';

export class CreatePatientDocumentDto {
  @ApiProperty({ example: 'Aadhaar Card' })
  @IsString()
  @MinLength(1, { message: 'Document name cannot be empty' })
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  documentName: string;

  @ApiPropertyOptional({ example: false, default: false })
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @ApiPropertyOptional({
    enum: DocumentApplicableFor,
    example: DocumentApplicableFor.BOTH,
    default: DocumentApplicableFor.BOTH,
  })
  @IsOptional()
  @IsEnum(DocumentApplicableFor, {
    message: 'applicableFor must be one of: OPD, IPD, BOTH',
  })
  applicableFor?: DocumentApplicableFor;

  @ApiPropertyOptional({
    example: ['pdf', 'jpg', 'png'],
    description: 'Allowed file extensions',
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  allowedFileTypes?: string[];

  @ApiPropertyOptional({ example: 5, default: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  maxFileSizeMB?: number;

  @ApiPropertyOptional({ example: 0, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
