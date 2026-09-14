import { IsEmail, IsNotEmpty, Matches, MinLength,IsString } from 'class-validator';

export class ForgotPasswordDto {
  // @IsEmail()
  // @IsNotEmpty()
  // email: string;

   @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'Verification code must be exactly 6 digits' })
  code: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  newPassword: string;
}