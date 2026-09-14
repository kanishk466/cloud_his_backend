import { IsEmail, IsNotEmpty } from 'class-validator';

/**
 * STEP 1 of the verification-code forgot-password flow.
 * (Separate from the existing token-based ForgotPasswordDto.)
 */
export class SendResetCodeDto {
    @IsEmail({}, { message: 'Please provide a valid work email' })
    @IsNotEmpty()
    email: string;
}
