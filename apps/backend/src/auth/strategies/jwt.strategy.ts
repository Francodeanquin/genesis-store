import { UserRole } from '@genesis/shared-types';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Request } from 'express';
import { Strategy } from 'passport-jwt';
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(configService: ConfigService) {
    super({
      jwtFromRequest: (req: Request) => {
        if (!req || !req.cookies) return null;
        return req.cookies['access_token'];
      },
      secretOrKey: configService.get<string>('JWT_SECRET')!,
    });
  }

  validate(payload: {
    sub: string;
    email: string;
    role: UserRole;
    type: 'user' | 'customer';
    mustChangePassword?: boolean;
  }) {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      type: payload.type,
      mustChangePassword: payload.mustChangePassword,
    };
  }
}
