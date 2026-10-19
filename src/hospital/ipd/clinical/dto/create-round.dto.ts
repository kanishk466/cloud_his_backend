import { Type } from 'class-transformer';
import {
  IsDate,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

/** `POST /ipd/rounds` — one doctor round note (SOAP). */
export class CreateRoundDto {
  @IsUUID()
  admissionId: string;

  /** The doctor who rounded; optional for team rounds recorded by nursing. */
  @IsOptional()
  @IsUUID()
  doctorProfileId?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  roundAt?: Date;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  subjective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  objective?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  assessment?: string;

  @IsOptional()
  @IsString()
  @MaxLength(4000)
  plan?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  nextRoundAt?: Date;
}
