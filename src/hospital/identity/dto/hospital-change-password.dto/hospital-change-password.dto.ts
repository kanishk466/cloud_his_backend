import { IsNotEmpty, IsString, MinLength } from 'class-validator';

export class HospitalChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  oldPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}