import {
  IsUUID,
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsBoolean,
  Min,
  Max,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateDoctorProfileDto {
  @IsUUID()
  @IsNotEmpty()
  hospitalUserId!: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  specialization!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  qualifications?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  consultationFee!: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(5)
  @Max(120)
  slotDurationMins?: number = 15;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(60)
  bufferTimeMins?: number = 0;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  maxPatientsPerDay?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;
}