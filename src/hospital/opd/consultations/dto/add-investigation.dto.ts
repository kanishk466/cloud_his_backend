import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum InvestigationType {
  LAB = 'LAB',
  RADIOLOGY = 'RADIOLOGY',
  PATHOLOGY = 'PATHOLOGY',
  CARDIOLOGY = 'CARDIOLOGY',
  OTHER = 'OTHER',
}

export enum InvestigationUrgency {
  ROUTINE = 'ROUTINE',
  URGENT = 'URGENT',
  STAT = 'STAT',
}

export class AddInvestigationDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  investigationName!: string;

  @IsEnum(InvestigationType)
  investigationType!: InvestigationType;

  @IsEnum(InvestigationUrgency)
  urgency!: InvestigationUrgency;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  instructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  clinicalNotes?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;
}