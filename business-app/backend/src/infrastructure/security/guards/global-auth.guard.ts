import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthContext } from '../types/auth-context.types';
import { UsersService } from '../../../modules/users/users.service';

/**
 * Global authentication guard — registered via APP_GUARD in SecurityModule.
 * Applied to every authenticated request.
 *
 * Strategy: DB-lookup RBAC (DEC-008 rev-2).
 *   The JWT only carries { sub, type }. After verifying the token, the guard
 *   loads the full User document from MongoDB and attaches role, scope,
 *   companyId, businessKey, and email to the AuthContext. This guarantees that
 *   role changes (e.g. deactivation, promotion) take effect on the next
 *   request without requiring a new token.
 *
 * Decision order:
 *   1. @Public() decorator → allow without auth
 *   2. Authorization: Bearer <jwt> → verify token, DB lookup, attach AuthContext
 *   3. x-api-key === COMMUNICATION_API_KEY → allow (internal engine endpoints)
 *   4. x-api-key as scoped modules key → TODO Phase 4
 *   5. None of the above → 401 Unauthorized
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();

    // ── 1. Public route ───────────────────────────────────────────────────────
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    // ── 2. JWT Bearer token ───────────────────────────────────────────────────
    const authHeader = request.headers['authorization'];
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      try {
        const secret =
          this.config.get<string>('JWT_ACCESS_SECRET') ??
          'phase1a-placeholder-replace-before-phase1b';

        const payload = await this.jwtService.verifyAsync<{
          sub: string;
          type?: string;
        }>(token, { secret });

        if (payload.type !== 'access') {
          throw new UnauthorizedException('Invalid token type');
        }

        // DB lookup — populates role, scope, companyId, businessKey, email.
        // Also enforces isActive: deactivated users are rejected here.
        const user = await this.users.findById(payload.sub);
        if (!user) {
          throw new UnauthorizedException('User not found');
        }
        if (!user.isActive) {
          throw new UnauthorizedException('Account is deactivated');
        }

        const authContext: AuthContext = {
          actorType: 'user',
          userId: payload.sub,
          email: user.email,
          role: user.role,
          scope: user.scope ?? 'company',
          companyId: user.companyId ? String(user.companyId) : null,
          businessKey: user.businessKey ?? null,
        };

        (request as any).authContext = authContext;
        return true;
      } catch (err: any) {
        if (err instanceof UnauthorizedException) throw err;
        // Expired or malformed JWT.
        throw new UnauthorizedException('Invalid or expired token');
      }
    }

    // ── 3. Internal COMMUNICATION_API_KEY (internal engine endpoints) ─────────
    const apiKeyHeader = request.headers['x-api-key'] as string | undefined;
    if (apiKeyHeader) {
      const internalKey = this.config.get<string>('COMMUNICATION_API_KEY');
      if (internalKey && apiKeyHeader === internalKey) {
        (request as any).authContext = {
          actorType: 'apikey',
          keyId: 'internal',
        } satisfies AuthContext;
        return true;
      }
    }

    // ── 4. Scoped modules API key — TODO Phase 4 ─────────────────────────────

    // ── 5. No valid authentication ────────────────────────────────────────────
    throw new UnauthorizedException('Authentication required');
  }
}
