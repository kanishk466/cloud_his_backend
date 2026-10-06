import { IsOptional, IsBoolean, IsUUID, IsEnum, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ThresholdActionType } from '@prisma/client';

export class QueryThresholdLimitDto {
  @ApiPropertyOptional({ description: 'Filter by panel id' })
  @IsOptional()
  @IsUUID()
  panelId?: string;

  @ApiPropertyOptional({ description: 'Filter by room type id' })
  @IsOptional()
  @IsUUID()
  roomTypeId?: string;

  @ApiPropertyOptional({ enum: ThresholdActionType })
  @IsOptional()
  @IsEnum(ThresholdActionType)
  actionType?: ThresholdActionType;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => (value === 'true' || value === true ? true : value === 'false' || value === false ? false : value))
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
