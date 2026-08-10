import {
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Max,
  MaxLength,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ApplyDiscountDto {
  // Either percent or amount (not both)
  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @Max(100)
  discountPercent?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  discountAmount?: number;

  @IsString()
  @MaxLength(500)
  discountReason?: string;

  @IsOptional()
  @IsString()
  discountAuthorizedBy?: string;
}