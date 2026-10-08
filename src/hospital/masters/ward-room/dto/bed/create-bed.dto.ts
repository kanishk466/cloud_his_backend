import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class CreateBedDto {
  @IsUUID()
  @IsNotEmpty()
  roomId: string;

  /** e.g., "01", "02", "A", "B". bedIdentifier is auto-generated. */
  @IsString()
  @IsNotEmpty()
  @MaxLength(10)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  bedNumber: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
