import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

/**
 * STEP 2 of the verification-code forgot-password flow:
 * admin submits the emailed 6-digit code together with the new password.
 * (Separate from the existing token-based ResetPasswordDto.)
 */
export class ResetPasswordWithCodeDto {
  @IsEmail({}, { message: 'Please provide a valid work email' })
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
