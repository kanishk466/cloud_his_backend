import {
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class CreateTokenDto {
  @IsUUID()
  @IsNotEmpty()
  appointmentId!: string;

  // Optional: assign patient to specific room/counter
  @IsOptional()
  @IsString()
  @MaxLength(50)
  roomNo?: string;
}