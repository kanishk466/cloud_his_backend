import { IsString, IsEnum, IsNumber, IsOptional, IsBoolean, MaxLength, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ServiceCategory } from '@prisma/client';

export class CreateServiceDto {
  @IsString() @MaxLength(50)
  serviceCode: string;

  @IsString() @MaxLength(200)
  serviceName: string;

  @IsEnum(ServiceCategory)
  category: ServiceCategory;

  @Type(() => Number) @IsNumber() @Min(0)
  baseRate: number;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}