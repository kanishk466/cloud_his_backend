import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsNumber,
  IsInt,
  IsEnum,
  Min,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export enum SlotDuration {
  TEN = 10,
  FIFTEEN = 15,
  TWENTY = 20,
  THIRTY = 30,
  FORTY_FIVE = 45,
  SIXTY = 60,
}

export class CreateDoctorProfileDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  specialization: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  qualifications?: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Type(() => Number)
  consultationFee: number;

  @IsEnum(SlotDuration, {
    message: 'slotDurationMins must be one of: 10, 15, 20, 30, 45, 60',
  })
  @Type(() => Number)
  slotDurationMins: SlotDuration;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Type(() => Number)
  bufferTimeMins?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  maxPatientsPerDay?: number;
}