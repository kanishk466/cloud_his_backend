import {
  Body,
  Controller,
  Post,
  UseGuards,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { HospitalAuthService } from '../services/hospital-auth.service';
import { HospitalLoginDto } from '../dto/hospital-login.dto/hospital-login.dto';
import { HospitalRefreshDto } from '../dto/hospital-refresh.dto/hospital-refresh.dto';
import { HospitalJwtAuthGuard } from '../guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { HospitalChangePasswordDto } from '../dto/hospital-change-password.dto/hospital-change-password.dto';
import type { Request, Response } from 'express';

@Controller('hospital/auth')
export class HospitalAuthController {
  constructor(private readonly authService: HospitalAuthService) {}

  @Post('login')
  async login(
    @Body() dto: HospitalLoginDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto.email, dto.password);

    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return {
      accessToken: result.accessToken,
      forcePasswordChange: result.forcePasswordChange,
      hospital: result.hospital,
      user: result.user,
    };
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refreshToken;

    if (!refreshToken) {
      throw new UnauthorizedException('Refresh token missing');
    }

    const tokens = await this.authService.refresh(refreshToken);

    // Refresh-token rotation
    res.cookie('refreshToken', tokens.refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return {
      accessToken: tokens.accessToken,
    };
  }

  @Post('change-password')
  @UseGuards(HospitalJwtAuthGuard)
  changePassword(@Req() req: any, @Body() dto: HospitalChangePasswordDto) {
    // req.user comes from HospitalJwtStrategy validate()
    return this.authService.changePassword(
      req.user.userId,
      dto.oldPassword,
      dto.newPassword,
    );
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const refreshToken = req.cookies?.refreshToken;

    const result = await this.authService.logout(refreshToken);

    res.clearCookie('refreshToken', {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      path: '/',
    });

    return result;
  }
}
