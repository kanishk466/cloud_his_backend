import { IsDateString, IsInt, IsOptional,IsString } from 'class-validator';

export class AssignPackageDto {
  @IsInt()
  hospitalId!: number;

  @IsInt()
  packageId!: number;

  @IsDateString()
  startDate!: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsString()
  status!: string;
}