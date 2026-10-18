import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';
import { BedStatusType } from '@prisma/client';

export class UpdateBedStatusDto {
  @IsEnum(BedStatusType)
  @IsNotEmpty()
  status!: BedStatusType;

  /** Required when status is RESERVED or OCCUPIED. */
  @IsOptional()
  @IsUUID()
  patientId?: string;

  /** IPD admission reference (future IPD module). */
  @IsOptional()
  @IsString()
  @MaxLength(50)
  ipdAdmissionId?: string;

  /** e.g., "Admission via ER", "Post-surgery recovery", "Deep cleaning". */
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
