import {
  IsDateString,
  IsOptional,
  IsString,
  MaxLength,
  Matches,
  ValidateIf,
} from 'class-validator';

export class AddLeaveBlockDto {
  @IsDateString({}, { message: 'blockDate must be a valid date (YYYY-MM-DD)' })
  blockDate!: string;

  @IsOptional()
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'startTime must be in HH:mm format',
  })
  startTime?: string;

  // endTime is required ONLY when startTime is provided
  @ValidateIf((o) => o.startTime !== undefined && o.startTime !== null)
  @IsString()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/, {
    message: 'endTime must be in HH:mm format',
  })
  endTime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  reason?: string;
}