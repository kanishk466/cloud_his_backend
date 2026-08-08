import { IsOptional, IsDateString } from 'class-validator';

export class ListLeavesQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'from must be a valid date (YYYY-MM-DD)' })
  from?: string;

  @IsOptional()
  @IsDateString({}, { message: 'to must be a valid date (YYYY-MM-DD)' })
  to?: string;
}