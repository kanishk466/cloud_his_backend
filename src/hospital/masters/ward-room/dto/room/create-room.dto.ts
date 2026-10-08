import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { WardGender } from '@prisma/client';

export class CreateRoomDto {
  @IsUUID()
  @IsNotEmpty()
  roomTypeId: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  roomNumber: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  floor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  wing?: string;

  @IsOptional()
  @IsEnum(WardGender)
  gender?: WardGender;

  /** Expected capacity (informational — beds are created separately). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  maxBeds?: number;

  @IsOptional()
  @IsBoolean()
  hasAC?: boolean;

  @IsOptional()
  @IsBoolean()
  hasAttachedBath?: boolean;

  @IsOptional()
  @IsBoolean()
  hasTV?: boolean;

  @IsOptional()
  @IsBoolean()
  hasOxygen?: boolean;

  @IsOptional()
  @IsBoolean()
  hasMonitor?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
