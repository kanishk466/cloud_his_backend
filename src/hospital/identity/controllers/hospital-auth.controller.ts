import { Body, Controller, Post, UseGuards, Req } from '@nestjs/common';
import { HospitalAuthService } from '../services/hospital-auth.service';
import { HospitalLoginDto } from '../dto/hospital-login.dto/hospital-login.dto';
import { HospitalRefreshDto } from '../dto/hospital-refresh.dto/hospital-refresh.dto';
import { HospitalJwtAuthGuard } from '../guards/hospital-jwt-auth/hospital-jwt-auth.guard';
import { HospitalChangePasswordDto } from '../dto/hospital-change-password.dto/hospital-change-password.dto';

@Controller('hospital/auth')
export class HospitalAuthController {
  constructor(private readonly authService: HospitalAuthService) {}

@Post('login')
login(@Body() dto: HospitalLoginDto) {
  return this.authService.login(dto.email, dto.password);
}

  @Post('refresh')
  refresh(@Body() dto: HospitalRefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('change-password')
  @UseGuards(HospitalJwtAuthGuard)
  changePassword(@Req() req: any, @Body() dto: HospitalChangePasswordDto) {
    // req.user comes from HospitalJwtStrategy validate()
    return this.authService.changePassword(req.user.userId, dto.oldPassword, dto.newPassword);
  }

  @Post('logout')
  logout(@Body() dto: HospitalRefreshDto) {
    return this.authService.logout(dto.refreshToken);
  }
}