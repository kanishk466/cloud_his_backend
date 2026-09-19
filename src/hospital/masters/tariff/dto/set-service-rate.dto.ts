import { IsUUID, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';

export class SetServiceRateDto {
  @IsUUID()
  serviceId: string;

  @Type(() => Number) @IsNumber() @Min(0)
  rate: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  discountPercent?: number;
}

export class BulkSetServiceRatesDto {
  rates: SetServiceRateDto[];
}