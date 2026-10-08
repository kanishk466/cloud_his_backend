import {
  IsString,
  IsNumber,
  IsOptional,
  IsBoolean,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

// ⚠️ LEGACY: This DTO backs the old /hospital/masters/services endpoint.
// New integrations should use /hospital/masters/service-items (Phase 2.1),
// which supports categories, sub-categories and billing rules.
export class CreateServiceDto {
  @IsString()
  @MaxLength(50)
  serviceCode: string;

  @IsString()
  @MaxLength(200)
  serviceName: string;

  @Type(() => Number)
  @IsNumber()
  @Min(0)
  baseRate: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
