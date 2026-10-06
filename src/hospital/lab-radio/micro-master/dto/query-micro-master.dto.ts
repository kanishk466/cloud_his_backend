import { IsOptional, IsString, IsBoolean, IsEnum, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MicroMasterType } from '@prisma/client';

export class QueryMicroMasterDto {
  @ApiPropertyOptional({ example: 'coli' })
  @IsOptional() @IsString() @Transform(({ value }) => value?.trim())
  search?: string;

  @ApiPropertyOptional({ enum: MicroMasterType, example: 'ORGANISM' })
  @IsOptional() @IsEnum(MicroMasterType)
  type?: MicroMasterType;

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
