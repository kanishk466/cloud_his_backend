import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
// === SECURITY ADDITION START ===
import { AuthSecurityService } from '../../../common/auth/auth-security.service';
import { SECURITY_FLAGS, securityFlag } from '../../../common/auth/security-config';
// === SECURITY ADDITION END ===

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private readonly configService: ConfigService,
    // === SECURITY ADDITION START ===
    private readonly authSecurityService: AuthSecurityService,
    // === SECURITY ADDITION END ===
  ) {
    super({
      jwtFromRequest:
        ExtractJwt.fromAuthHeaderAsBearerToken(),

      ignoreExpiration: false,

      secretOrKey:
        configService.get<string>(
          'JWT_ACCESS_SECRET',
        )!,
    });
  }

  async validate(payload: any) {
    // === SECURITY ADDITION START ===
    if (securityFlag(SECURITY_FLAGS.sessionManagement)) {
      await this.authSecurityService.assertActiveSession(payload.sessionId);
    }
    // === SECURITY ADDITION END ===
    return payload;
  }
}