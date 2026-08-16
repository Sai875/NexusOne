import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthUser } from './auth-user';
import { ROLES_KEY } from './roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const user = context.switchToHttp().getRequest<{ user?: AuthUser }>().user;
    if (!user) throw new UnauthorizedException();

    const allowed =
      user.roles.includes('SUPER_ADMIN') ||
      requiredRoles.some((role) => user.roles.includes(role));
    if (!allowed) throw new ForbiddenException('Insufficient role');
    return allowed;
  }
}
