import {
  IsString,
  IsOptional,
  IsBoolean,
  IsUUID,
  IsNumber,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProMappingDto {
  @ApiProperty({ description: 'Refer doctor id this PRO promotes' })
  @IsUUID()
  referDoctorId: string;

  @ApiPropertyOptional({ example: 'Ravi Kumar', description: 'PRO name (if not a system user)' })
  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(({ value }) => value?.trim())
  proName?: string;

  @ApiPropertyOptional({ description: 'HospitalUser id of the PRO (if linked)' })
  @IsOptional()
  @IsUUID()
  hospitalUserId?: string;

  @ApiPropertyOptional({ example: 5, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(100)
  commissionPercent?: number;

  @ApiPropertyOptional({ example: true, default: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
