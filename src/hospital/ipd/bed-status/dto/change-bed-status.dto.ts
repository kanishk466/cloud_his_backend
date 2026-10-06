import { IsEnum, IsOptional, IsUUID, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BedCurrentStatus } from '@prisma/client';

export class ChangeBedStatusDto {
  @ApiProperty({ enum: BedCurrentStatus, example: 'OCCUPIED' })
  @IsEnum(BedCurrentStatus)
  status: BedCurrentStatus;

  @ApiPropertyOptional({ description: 'Patient id (required when OCCUPIED)' })
  @IsOptional()
  @IsUUID()
  patientId?: string;

  @ApiPropertyOptional({ description: 'IPD admission id (when occupied via admission)' })
  @IsOptional()
  @IsUUID()
  admissionId?: string;

  @ApiPropertyOptional({ example: 'Reason for change' })
  @IsOptional()
  @IsString()
  remarks?: string;
}
