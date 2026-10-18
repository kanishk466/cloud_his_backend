import { Transform } from 'class-transformer';
import {
  IsBoolean,
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export const BANK_ACCOUNT_TYPES = ['SAVINGS', 'CURRENT'] as const;

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

const trimUpper = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim().toUpperCase() : value;

export class CreateBankDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @Transform(trim)
  bankName: string;

  @IsOptional()
  @IsString()
  @MaxLength(150)
  @Transform(trim)
  branchName?: string;

  // Indian IFSC: 4 letters, '0', then 6 alphanumerics (e.g. SBIN0001234)
  @IsOptional()
  @Matches(/^[A-Z]{4}0[A-Z0-9]{6}$/, {
    message: 'ifscCode must be a valid IFSC code (e.g. SBIN0001234)',
  })
  @Transform(trimUpper)
  ifscCode?: string;

  @IsOptional()
  @IsString()
  @Matches(/^[0-9A-Za-z]{6,34}$/, {
    message: 'accountNumber must be 6-34 alphanumeric characters',
  })
  @Transform(trim)
  accountNumber?: string;

  @IsOptional()
  @IsIn(BANK_ACCOUNT_TYPES, {
    message: `accountType must be one of: ${BANK_ACCOUNT_TYPES.join(', ')}`,
  })
  @Transform(trimUpper)
  accountType?: (typeof BANK_ACCOUNT_TYPES)[number];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
