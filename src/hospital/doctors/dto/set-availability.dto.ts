import {
  IsArray,
  IsInt,
  IsString,
  IsNotEmpty,
  ValidateNested,
  Min,
  Max,
  Matches,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AvailabilityWindowDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number; // 0=Sunday, 6=Saturday

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format (24hr)',
  })
  startTime: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format (24hr)',
  })
  endTime: string;
}

export class SetAvailabilityDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one availability window is required' })
  @ValidateNested({ each: true })
  @Type(() => AvailabilityWindowDto)
  schedule: AvailabilityWindowDto[];
}