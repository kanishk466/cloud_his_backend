import {
  IsString, IsOptional, IsBoolean, IsNumber, IsEmail, IsUUID,
  IsDateString, IsEnum, Min, Max, MaxLength, ValidateIf,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CoPaymentOn } from '@prisma/client';

export class CreatePanelDto {
  @IsString() @MaxLength(150)
  panelName: string;

  // GlobalMaster IDs (from dropdowns)
  @IsOptional() @IsUUID()
  groupTypeId?: string;

  @IsOptional() @IsUUID()
  paymentModeId?: string;

  @IsOptional() @IsUUID()
  panelTypeId?: string;

  @IsOptional() @IsUUID()
  rateCurrencyId?: string;

  @IsOptional() @IsUUID()
  billCurrencyId?: string;

  // Contact
  @IsOptional() @IsString() @MaxLength(100)
  contactPerson?: string;

  @IsOptional() @IsString()
  address1?: string;

  @IsOptional() @IsString()
  address2?: string;

  @IsOptional() @IsString() @MaxLength(20)
  contactNo?: string;

  @IsOptional() @IsString() @MaxLength(20)
  phoneNo?: string;

  @IsOptional() @IsEmail()
  email?: string;

  @IsOptional() @IsString()
  faxNo?: string;

  // Validity & Credit
  @IsOptional() @IsDateString()
  validFrom?: string;

  @IsOptional() @IsDateString()
  validTo?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  creditLimit?: number;

  // Tariff linking (Refer Rate OPD / IPD)
  @IsOptional() @IsUUID()
  opdTariffId?: string;

  @IsOptional() @IsUUID()
  ipdTariffId?: string;

  // Flags
  @IsOptional() @IsBoolean()
  rateTypeSelfOpd?: boolean;

  @IsOptional() @IsBoolean()
  rateTypeSelfIpd?: boolean;

  @IsOptional() @IsBoolean()
  showPrintout?: boolean;

  @IsOptional() @IsBoolean()
  hideRate?: boolean;

  @IsOptional() @IsBoolean()
  coverNote?: boolean;

  @IsOptional() @IsBoolean()
  isSmartCard?: boolean;

  @IsOptional() @IsBoolean()
  hasEncounter?: boolean;

  @IsOptional() @IsBoolean()
  isUsdBased?: boolean;

  @IsOptional() @IsBoolean()
  dietTypePrivate?: boolean;

  // Co-Payment
  @IsOptional() @IsEnum(CoPaymentOn)
  coPaymentOn?: CoPaymentOn;

  @ValidateIf((o) => o.coPaymentOn && o.coPaymentOn !== 'NONE')
  @Type(() => Number) @IsNumber() @Min(0) @Max(100)
  coPaymentPercent?: number;

  // Currency conversion
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  currencyConv?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0)
  panelAmount?: number;
}