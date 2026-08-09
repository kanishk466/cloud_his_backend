import {
  IsDateString,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  IsNotEmpty,
} from 'class-validator';

export class CreateLeaveBlockDto {
  // ISO date: "2025-06-15"
  @IsDateString()
  @IsNotEmpty()
  blockDate!: string;

  // Optional: null = full day leave
  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  startTime?: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}