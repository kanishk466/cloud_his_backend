// src/hospital/auth/guards/hospital-jwt-auth/hospital-jwt.strategy.ts
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { AuthSecurityService } from '../../../common/auth/auth-security.service';
import { SECURITY_FLAGS, securityFlag } from '../../../common/auth/security-config';
import { CurrentUserPayload } from '../../core/decorators/current-user.decorator';

export interface HospitalJwtPayload {
  sub: string;            // userId
  email: string;
  code: string;           // hospitalCode
  userType: string;       // SUPER_ADMIN | REGULAR_USER
  tenantId: string;
  aud: string;            // 'hospital'
  sessionId?: string;
  roles?: string[];
  permissions?: string[];
  iat?: number;
  exp?: number;
}

@Injectable()
export class HospitalJwtStrategy extends PassportStrategy(
  Strategy,
  'hospital-jwt',
) {
  constructor(
    private readonly authSecurityService: AuthSecurityService,
  ) {
    const jwtSecret = process.env.JWT_ACCESS_SECRET;
    if (!jwtSecret) {
      throw new Error('FATAL: JWT_ACCESS_SECRET is missing in environment variables');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,      // 🔒 Expired token ko accept nahi karega
      secretOrKey: jwtSecret,
      audience: 'hospital',         // 🔒 Sirf 'hospital' audience wale tokens hi allow honge
    });
  }

  async validate(payload: HospitalJwtPayload): Promise<CurrentUserPayload> {
    if (!payload || !payload.sub) {
      throw new UnauthorizedException('Malformed token payload');
    }

    // === 1. SESSION MANAGEMENT CHECK ===
    if (securityFlag(SECURITY_FLAGS.sessionManagement) && payload.sessionId) {
      await this.authSecurityService.assertActiveSession(payload.sessionId);
    }

    // === 2. RETURN PAYLOAD FOR @CurrentUser() DECORATOR ===
    return {
      userId: payload.sub,
      email: payload.email,
      code: payload.code,
      tenantId: payload.tenantId,
      userType: payload.userType,
      roles: payload.roles ?? [],
      permissions: payload.permissions ?? [],
      sessionId: payload.sessionId,
    };
  }
}