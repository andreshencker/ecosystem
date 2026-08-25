import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthContext } from '../types/auth-context.types';

/**
 * Extracts the full AuthContext from the request.
 * Returns undefined on public routes where no auth context is set.
 *
 * @example
 * @Get('me')
 * getProfile(@CurrentUser() ctx: AuthContext) { ... }
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    return request.authContext as AuthContext | undefined;
  },
);
