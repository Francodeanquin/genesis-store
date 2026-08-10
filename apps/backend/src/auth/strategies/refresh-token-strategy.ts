// strategies/rt.strategy.ts
import { UserRole } from '@genesis/shared-types';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class RtStrategy extends PassportStrategy(Strategy, 'jwt-refresh') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        if (!req || !req.cookies) return null;
        return req.cookies['refresh_token'];
      },
      secretOrKey: configService.get<string>('JWT_REFRESH_SECRET')!,
      passReqToCallback: true,
    });
  }

  validate(
    req: Request,
    payload: {
      sub: string;
      email: string;
      role: UserRole;
      type: 'user' | 'customer';
    },
  ) {
    const refreshToken = req.cookies['refresh_token'];
    if (!refreshToken) throw new UnauthorizedException();
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      refreshToken,
      type: payload.type,
    };
  }
}
