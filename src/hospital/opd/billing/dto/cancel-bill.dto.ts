import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class CancelBillDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  cancelReason!: string;
}