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

/**
 * Global authentication guard — registered via APP_GUARD in SecurityModule.
 * Applied to every incoming HTTP request.
 *
 * Decision order:
 *   1. @Public() decorator → allow without auth
 *   2. Authorization: Bearer <jwt> → validate JWT, attach AuthContext
 *   3. x-api-key === COMMUNICATION_API_KEY → allow (legacy engine endpoints)
 *   4. x-api-key as scoped platform key → TODO Phase 4 (ApiKeysModule)
 *   5. None of the above → 401 Unauthorized
 *
 * Step 3 is a temporary compatibility measure so the communication engine
 * management endpoints (which use their own inline assertApiKey()) continue
 * to function during the transition period. It will be removed in Phase 4
 * when all engine endpoints are fully migrated to the gateway pattern.
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
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
          organizationId?: string;
        }>(token, { secret });

        if (payload.type !== 'access') {
          throw new UnauthorizedException('Invalid token type');
        }

        const authContext: AuthContext = {
          actorType: 'user',
          userId: payload.sub,
          organizationId: payload.organizationId,
        };

        (request as any).authContext = authContext;
        return true;
      } catch (err: any) {
        if (err instanceof UnauthorizedException) throw err;
        // Expired or malformed JWT — fall through to other auth methods.
      }
    }

    // ── 3. Internal COMMUNICATION_API_KEY (legacy engine endpoints) ───────────
    // Allows communication engine management controllers (which use their own
    // inline assertApiKey()) to remain accessible during Phase 3.
    // TODO: Remove this in Phase 4 once all engine endpoints are migrated.
    const apiKeyHeader = request.headers['x-api-key'] as string | undefined;
    if (apiKeyHeader) {
      const internalKey = this.config.get<string>('COMMUNICATION_API_KEY');
      if (internalKey && apiKeyHeader === internalKey) {
        (request as any).authContext = {
          actorType: 'apikey',
          keyId: 'internal',
          organizationId: undefined,
        } satisfies AuthContext;
        return true;
      }
    }

    // ── 4. Scoped platform API key ────────────────────────────────────────────
    // TODO Phase 4: hash apiKeyHeader, look up in Redis cache then MongoDB,
    // validate status + expiry, attach AuthContext { actorType: 'apikey', ... }.

    // ── 5. No valid authentication found ─────────────────────────────────────
    throw new UnauthorizedException('Authentication required');
  }
}
