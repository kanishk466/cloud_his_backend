import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { BedStatusType, WardGender } from '@prisma/client';

export class FilterBedDto {
  @IsOptional()
  @IsUUID()
  roomId?: string;

  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  /** Filters by the bed's CURRENT status. */
  @IsOptional()
  @IsEnum(BedStatusType)
  status?: BedStatusType;

  /** Filters by the room's gender ward. */
  @IsOptional()
  @IsEnum(WardGender)
  gender?: WardGender;

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
