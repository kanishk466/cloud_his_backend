import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class SettleCommissionDto {
  @IsIn(['APPROVED', 'PAID', 'CANCELLED'])
  status!: 'APPROVED' | 'PAID' | 'CANCELLED';

  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
