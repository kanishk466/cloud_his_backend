import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CancelAppointmentDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  cancelReason!: string;
}