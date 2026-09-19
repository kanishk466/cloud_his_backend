import { IsString, IsOptional, IsBoolean, MaxLength } from 'class-validator';

export class CreateTariffDto {
  @IsString() @MaxLength(50)
  tariffCode: string;

  @IsString() @MaxLength(150)
  tariffName: string;

  @IsOptional() @IsBoolean()
  isActive?: boolean;
}