import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Res,
  UnauthorizedException,
  UseGuards,
  Req
} from '@nestjs/common';
import type { Response , Request } from 'express';

import { HospitalAuthService } from '../services/hospital-auth.service';
import { HospitalLoginDto } from '../dto/hospital-login.dto/hospital-login.dto';
import { HospitalChangePasswordDto } from '../dto/hospital-change-password.dto/hospital-change-password.dto';
import { VerifyOtpDto } from '../dto/verify-otp.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { HospitalJwtAuthGuard } from '../guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { CurrentUser } from '../../core/decorators/current-user.decorator';
import { Cookies } from '../../core/decorators/cookies.decorator';
import {
  REFRESH_COOKIE_NAME,
  getRefreshCookieOptions,
} from '../../constants/cookie.config';



interface RequestWithCookies extends Request {
  cookies: Record<string, string | undefined>;
}

@Controller('hospital/auth')
export class HospitalAuthController {
  constructor(private readonly authService: HospitalAuthService) {}

  /* ======================== LOGIN ======================== */

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: HospitalLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password);

    // 2FA required — no tokens yet, frontend shows OTP screen
    if (!('accessToken' in result)) {
      return result;
    }

    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      getRefreshCookieOptions(),
    );

    return {
      data: {
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        forcePasswordChange: result.forcePasswordChange,
        hospital: result.hospital,
        user: result.user,
      },
    };
  }

  /* ====================== VERIFY OTP ===================== */

  @Post('verify-otp')
  @HttpCode(HttpStatus.OK)
  async verifyOtp(
    @Body() dto: VerifyOtpDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyOtp(dto.otpToken, dto.code);

    // Now set the cookie — 2FA passed
    res.cookie(
      REFRESH_COOKIE_NAME,
      result.refreshToken,
      getRefreshCookieOptions(),
    );

    return {
      data: {
        accessToken: result.accessToken,
        expiresAt: result.expiresAt,
        forcePasswordChange: result.forcePasswordChange,
        hospital: result.hospital,
        user: result.user,
      },
    };
  }

  /* ======================= REFRESH ======================= */

  // @Post('refresh')
  // @HttpCode(HttpStatus.OK)
  // async refresh(
  //   @Cookies(REFRESH_COOKIE_NAME) refreshToken: string | undefined,
  //   @Res({ passthrough: true }) res: Response,
  // ) {
  //   if (!refreshToken) {
  //     throw new UnauthorizedException('Refresh token missing');
  //   }

  //   const tokens = await this.authService.refresh(refreshToken);

  //   // Rotation — new refresh token in cookie
  //   res.cookie(
  //     REFRESH_COOKIE_NAME,
  //     tokens.refreshToken,
  //     getRefreshCookieOptions(),
  //   );

  //   return {
  //     accessToken: tokens.accessToken,
  //     expiresAt: tokens.expiresAt,
  //   };
  // }





@Post('refresh')
@HttpCode(HttpStatus.OK)
async refresh(
  @Req() req: RequestWithCookies,
  @Body() body: { refreshToken?: string }, 
  @Res({ passthrough: true }) res: Response,
) {
  // 1. Pehle Cookie check karo, agar cookie nahi mili toh Body check karo
  const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME] || body?.refreshToken;

  // Debug log (Console me check karne ke liye)
  if (!refreshToken) {
    console.log('❌ [Refresh Debug] Cookies received:', req.cookies);
    console.log('❌ [Refresh Debug] Cookie Header:', req.headers.cookie);
    console.log('❌ [Refresh Debug] Body received:', body);
    throw new UnauthorizedException('Refresh token missing');
  }

  const tokens = await this.authService.refresh(refreshToken);

  // 2. Cookie update karo (Rotation)
  res.cookie(
    REFRESH_COOKIE_NAME,
    tokens.refreshToken,
    getRefreshCookieOptions(),
  );

  // 3. Response me accessToken aur refreshToken dono bhejo
  return {
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken, // Frontend body se bhi save kar sake
    expiresAt: tokens.expiresAt,
  };
}




  /* =================== CHANGE PASSWORD =================== */

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(HospitalJwtAuthGuard)
  async changePassword(
    @CurrentUser('userId') userId: string,
    @Body() dto: HospitalChangePasswordDto,
  ) {
    return this.authService.changePassword(
      userId,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  /* ================== FORGOT PASSWORD ==================== */

  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto.email);
  }

  /* ================== RESET PASSWORD ===================== */

  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto.resetToken, dto.newPassword);
  }

  /* ======================= LOGOUT ======================== */

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Cookies(REFRESH_COOKIE_NAME) refreshToken: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logout(refreshToken);

    // Options MUST match what was used in res.cookie()
    res.clearCookie(REFRESH_COOKIE_NAME, getRefreshCookieOptions());

    return result;
  }
}