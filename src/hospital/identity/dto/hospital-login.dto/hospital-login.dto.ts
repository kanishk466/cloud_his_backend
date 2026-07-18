import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class HospitalLoginDto {
  @IsString()
  @IsNotEmpty()
  hospitalCode!: string;

  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}