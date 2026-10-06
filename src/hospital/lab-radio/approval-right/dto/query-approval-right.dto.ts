import { IsOptional, IsBoolean, IsUUID, IsInt, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryLabApprovalRightDto {
  @ApiPropertyOptional({ description: 'Filter by user id' })
  @IsOptional() @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ description: 'Filter by department id' })
  @IsOptional() @IsUUID()
  departmentId?: string;

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
