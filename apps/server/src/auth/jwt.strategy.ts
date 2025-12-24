import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

export type AdminJwtUser = {
  adminUserId: string;
  storeId: string;
  role?: 'OWNER' | 'STAFF';
  email?: string;
};

type JwtPayload = {
  sub: string;
  storeId: string;
  role?: 'OWNER' | 'STAFF';
  email?: string;
};

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: String(config.get('JWT_SECRET') ?? 'change-me')
    });
  }

  async validate(payload: JwtPayload): Promise<AdminJwtUser> {
    return { adminUserId: payload.sub, storeId: payload.storeId, role: payload.role, email: payload.email };
  }
}
