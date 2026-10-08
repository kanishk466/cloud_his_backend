import {
  ArrayNotEmpty,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class BulkSettleCommissionsDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  commissionIds!: string[];

  @IsIn(['APPROVED', 'PAID', 'CANCELLED'])
  status!: 'APPROVED' | 'PAID' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
