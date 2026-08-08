import {
  IsDateString,
  IsUUID,
  IsNotEmpty,
} from 'class-validator';

export class GetSlotsDto {
  @IsUUID()
  @IsNotEmpty()
  doctorProfileId!: string;

  // Format: "2025-06-10"
  @IsDateString()
  @IsNotEmpty()
  date!: string;
}