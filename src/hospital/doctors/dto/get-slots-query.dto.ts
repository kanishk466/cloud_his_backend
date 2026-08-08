import { IsDateString, IsNotEmpty } from 'class-validator';

export class GetSlotsQueryDto {
  @IsDateString({}, { message: 'date must be a valid date (YYYY-MM-DD)' })
  @IsNotEmpty()
  date!: string;
}