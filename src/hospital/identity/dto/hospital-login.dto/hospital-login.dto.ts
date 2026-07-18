import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

export class HospitalLoginDto {
  @IsString()
  @IsEmail()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}