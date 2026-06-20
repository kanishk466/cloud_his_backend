import {
  IsEmail,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateHospitalDto {
  @IsString()
  code!: string;

  @IsString()
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  phone?: string;
}