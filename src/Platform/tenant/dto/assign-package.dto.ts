import { IsDateString, IsInt, IsOptional } from 'class-validator';

export class AssignPackageDto {
  @IsInt()
  packageId!: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}