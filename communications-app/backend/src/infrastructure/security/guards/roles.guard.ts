import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthContext, UserRole } from '../types/auth-context.types';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const required = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!required || required.length === 0) return true;
    const { authContext } = context.switchToHttp().getRequest() as any;
    const ctx: AuthContext | undefined = authContext;
    if (!ctx?.role || !required.includes(ctx.role)) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
