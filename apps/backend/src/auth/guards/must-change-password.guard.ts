import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_PASSWORD_CHECK_KEY } from '../decorators/skip-password-check.decorator';

@Injectable()
export class MustChangePasswordGuard implements CanActivate {
  constructor(private reflector: Reflector) {}
  canActivate(context: ExecutionContext): boolean {
    const skipPasswordCheck = this.reflector.getAllAndOverride<boolean>(
      SKIP_PASSWORD_CHECK_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (skipPasswordCheck) return true;

    const request = context.switchToHttp().getRequest();

    if (!request.user) return true;

    const { mustChangePassword } = request.user;

    if (mustChangePassword) {
      throw new ForbiddenException('Must change password first');
    }

    return true;
  }
}
