import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';

export class CreatePanelDocumentDto {
  @IsUUID()
  @IsNotEmpty()
  panelId: string;

  /** e.g., "TPA Pre-Authorization Form", "Claim Form B". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  documentName: string;

  /** e.g., "PRE_AUTH_FORM", "CLAIM_FORM_B", "IMPLANT_STICKER". */
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  @Matches(/^[A-Z0-9_-]+$/, {
    message:
      'documentCode may contain only letters, digits, underscore and hyphen',
  })
  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  )
  documentCode: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  description?: string;

  /** true = claim submission is blocked without this document. */
  @IsOptional()
  @IsBoolean()
  isMandatory?: boolean;

  @IsOptional()
  @IsBoolean()
  appliesToOpd?: boolean;

  @IsOptional()
  @IsBoolean()
  appliesToIpd?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
