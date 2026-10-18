import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { WardGender } from '@prisma/client';

export class FilterRoomDto {
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @IsOptional()
  @IsEnum(WardGender)
  gender?: WardGender;

  @IsOptional()
  @IsString()
  floor?: string;

  @IsOptional()
  @IsString()
  wing?: string;

  /** Matches roomNumber (case-insensitive). */
  @IsOptional()
  @IsString()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  search?: string;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) =>
    value === 'true' || value === true
      ? true
      : value === 'false' || value === false
        ? false
        : undefined,
  )
  isActive?: boolean;
}
