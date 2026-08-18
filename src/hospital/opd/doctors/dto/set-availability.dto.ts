import {
  IsArray,
  ValidateNested,
  IsInt,
  IsString,
  IsBoolean,
  IsOptional,
  Min,
  Max,
  Matches,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class DailyAvailabilityDto {
  // 0 = Sunday, 6 = Saturday
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek!: number;

  @IsBoolean()
  isActive!: boolean;

  // Required when isActive = true
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:MM format (e.g. 09:00)',
  })
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:MM format (e.g. 17:00)',
  })
  endTime?: string;

  // Optional break time (e.g., lunch 13:00 - 14:00)
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  breakStartTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  breakEndTime?: string;
}

// Full weekly schedule with slot duration
export class SetAvailabilityDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(7) 
  @ValidateNested({ each: true })
  @Type(() => DailyAvailabilityDto)
  schedule!: DailyAvailabilityDto[];

  // Optional: also update slot duration
  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(120)
  slotDurationMins?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(60)
  bufferTimeMins?: number;
}