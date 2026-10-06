import { IsOptional, IsString, IsBoolean, IsUUID, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QuerySampleTypeDto {
  @ApiPropertyOptional({ example: 'serum' })
  @IsOptional() @IsString() @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ description: 'Filter by container id' })
  @IsOptional() @IsUUID()
  containerId?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true ? true : value === 'false' || value === false ? false : value)
  @IsBoolean()
  isActive?: boolean;

  @ApiPropertyOptional({ example: 1, default: 1 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  page?: number;

  @ApiPropertyOptional({ example: 20, default: 20 })
  @IsOptional() @Type(() => Number) @IsInt() @Min(1)
  limit?: number;
}
