import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
// === SECURITY ADDITION START ===
import { AuthSecurityService } from '../../../common/auth/auth-security.service';
import { SECURITY_FLAGS, securityFlag } from '../../../common/auth/security-config';
// === SECURITY ADDITION END ===

@Injectable()
export class HospitalJwtStrategy extends PassportStrategy(
  Strategy,
  'hospital-jwt',
) {
  constructor(
    // === SECURITY ADDITION START ===
    private readonly authSecurityService: AuthSecurityService,
    // === SECURITY ADDITION END ===
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET!,
    });
  }

  async validate(payload: any) {
    // === SECURITY ADDITION START ===
    if (securityFlag(SECURITY_FLAGS.sessionManagement)) await this.authSecurityService.assertActiveSession(payload.sessionId);
    // === SECURITY ADDITION END ===
    if (payload.aud !== 'hospital')
      throw new UnauthorizedException('Invalid token audience');
    return {
      userId: payload.sub,
      code: payload.code,
      tenantId: payload.tenantId,
      email: payload.email,
      userType: payload.userType,
    };
  }
}
