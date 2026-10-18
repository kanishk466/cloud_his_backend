import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateObservationHelpDto {
  @IsUUID()
  @IsNotEmpty()
  observationId: string;

  /** e.g., "Sample Collection", "Interference", "Clinical Significance". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  helpTitle: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  helpText: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
