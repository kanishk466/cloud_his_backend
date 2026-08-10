import {
  IsUUID,
  IsOptional,
  IsString,
  IsNotEmpty,
  MaxLength,
} from 'class-validator';

export class CreateConsultationDto {
  @IsUUID()
  @IsNotEmpty()
  appointmentId!: string;

  // Pre-fill from vitals chief complaints
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  chiefComplaints?: string;
}