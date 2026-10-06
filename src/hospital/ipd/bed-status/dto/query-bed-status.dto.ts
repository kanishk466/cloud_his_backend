import { IsOptional, IsEnum, IsUUID, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { BedCurrentStatus } from '@prisma/client';

export class QueryBedStatusDto {
  @ApiPropertyOptional({ enum: BedCurrentStatus, example: 'VACANT' })
  @IsOptional()
  @IsEnum(BedCurrentStatus)
  currentStatus?: BedCurrentStatus;

  @ApiPropertyOptional({ description: 'Filter by room type id' })
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 50, default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
