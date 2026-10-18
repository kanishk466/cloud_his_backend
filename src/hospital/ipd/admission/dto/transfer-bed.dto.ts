import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class TransferBedDto {
  @IsUUID()
  @IsNotEmpty()
  newBedId: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
