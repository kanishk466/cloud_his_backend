import {
  IsDateString,
  IsOptional,
  IsString,
} from 'class-validator';

export class AssignPackageDto {
  @IsString()
  packageId!: string;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}