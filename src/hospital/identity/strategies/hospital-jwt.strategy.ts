import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class HospitalJwtStrategy extends PassportStrategy(Strategy, 'hospital-jwt') {
  constructor() {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_ACCESS_SECRET!,
    });
  }

  async validate(payload: any) {
    if (payload.aud !== 'hospital') throw new UnauthorizedException('Invalid token audience');
    return {
      userId: payload.sub,
      hospitalId: payload.hospitalId,
      email: payload.email,
      userType: payload.userType,
    };
  }
}