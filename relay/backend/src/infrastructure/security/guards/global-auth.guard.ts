import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { timingSafeEqual } from 'crypto';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import type { AuthContext } from '../types/auth-context.types';
import { CommunicationTokenValidatorService } from '../../../ecosystem/communication-token/communication-token-validator.service';
import { EcosystemIdentityService } from '../../../ecosystem/identity/ecosystem-identity.service';

/**
 * Global authentication guard — registered via APP_GUARD in SecurityModule.
 * Applied to every incoming HTTP request.
 *
 * Decision order:
 *   1. @Public() decorator → allow without auth
 *   2. Authorization: Bearer <jwt> → validate JWT, attach AuthContext
 *   3. x-api-key === RELAY_API_KEY → allow (internal engine endpoints)
 *   3.5. x-grapifly-service-secret === RELAY_SERVICE_SECRET → allow (Grapifly's
 *      own backend calling Relay directly, e.g. to send its own notifications —
 *      distinct from the external-app integration token below). Requires
 *      x-grapifly-organization-id (the specific org the action belongs to —
 *      never an implicit/active default) and resolves the local Company via
 *      EcosystemIdentityService.resolveGrapiflyCompanyByOrganization.
 *   4. Integration token → validate against Grapifly (CommunicationTokenValidatorService),
 *      allow if valid. Relay never issues or stores this token itself.
 *      Accepted in two headers:
 *        a. x-integration-token  — explicit header (e.g. GET /company-integrations/me)
 *        b. x-api-key            — when the value is NOT the admin key
 *                                  (e.g. Business App POST /notifications/event)
 *   5. None of the above → 401 Unauthorized
 */
@Injectable()
export class GlobalAuthGuard implements CanActivate {
  private readonly logger = new Logger(GlobalAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly config: ConfigService,
    private readonly communicationTokens: CommunicationTokenValidatorService,
    private readonly identity: EcosystemIdentityService,
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
          companyId?: string;
          companyKey?: string;
          role?: any;
          scope?: any;
          permissions?: string[];
          flow?: 'client' | 'provider' | 'internal';
        }>(token, { secret });

        if (payload.type !== 'access') {
          throw new UnauthorizedException('Invalid token type');
        }

        const authContext: AuthContext = {
          actorType: 'user',
          userId: payload.sub,
          companyId: payload.companyId ?? payload.organizationId,
          companyKey: payload.companyKey,
          grapiflyOrganizationId: payload.organizationId,
          role: payload.role,
          scope: payload.scope,
          permissions: payload.permissions ?? [],
          flow: payload.flow,
        };

        (request as any).authContext = authContext;
        return true;
      } catch (err: any) {
        if (err instanceof UnauthorizedException) throw err;
        // Expired or malformed JWT — fall through to other auth methods.
      }
    }

    // ── 3. Internal RELAY_API_KEY (admin engine endpoints) ────────────
    // When the admin key is used, the modules company (isPlatformCompany: true)
    // is resolved and stored in authContext.companyId so the notification
    // controller can use it as the effective companyId for event lookups.
    const apiKeyHeader = request.headers['x-api-key'] as string | undefined;
    if (apiKeyHeader) {
      const adminKey = this.config.get<string>('RELAY_API_KEY');
      if (adminKey && apiKeyHeader === adminKey) {
        const platformCompany = await this.communicationTokens
          .resolvePlatformCompany()
          .catch(() => null);
        if (!platformCompany) {
          this.logger.error(
            '[step3] No modules company (isPlatformCompany=true) found — admin-key auth cannot resolve base company. ' +
              'Ensure the modules company exists in Communications.',
          );
        } else {
          this.logger.log(
            `[step3] admin key — platform company resolved: companyId=${platformCompany.companyId} ` +
              `companyKey=${platformCompany.companyKey}`,
          );
        }
        (request as any).authContext = {
          actorType: 'apikey',
          keyId: 'internal',
          companyId: platformCompany?.companyId,
        } satisfies AuthContext;
        return true;
      }
    }

    // ── 3.5. Grapifly service-to-service trust ─────────────────────────────────
    // Distinct from the admin key and the integration token: this proves the
    // caller is Grapifly's own backend (not a user, not an external app), and
    // always carries the specific organizationId the action belongs to — never
    // an implicit "active" default — so the resolved Company can never be
    // ambiguous between callers.
    const grapiflyServiceSecret = request.headers[
      'x-grapifly-service-secret'
    ] as string | undefined;
    if (grapiflyServiceSecret) {
      const expectedSecret = this.config.get<string>('RELAY_SERVICE_SECRET');
      if (expectedSecret && this.secretsMatch(grapiflyServiceSecret, expectedSecret)) {
        const organizationId = (
          request.headers['x-grapifly-organization-id'] as string | undefined
        )?.trim();
        const organizationName = (
          request.headers['x-grapifly-organization-name'] as string | undefined
        )?.trim();
        if (!organizationId) {
          this.logger.warn(
            '[step3.5] x-grapifly-service-secret valid but x-grapifly-organization-id is missing',
          );
          throw new UnauthorizedException(
            'x-grapifly-organization-id header is required',
          );
        }
        const company = await this.identity.resolveGrapiflyCompanyByOrganization({
          organizationId,
          name: organizationName || organizationId,
        });
        this.logger.log(
          `[step3.5] grapifly-service secret valid — organizationId=${organizationId} ` +
            `companyId=${company._id}`,
        );
        (request as any).authContext = {
          actorType: 'apikey',
          keyId: 'grapifly-service',
          companyId: String(company._id),
        } satisfies AuthContext;
        return true;
      }
      this.logger.warn('[step3.5] invalid x-grapifly-service-secret presented');
      throw new UnauthorizedException('Invalid service secret');
    }

    // ── 4. Integration token ──────────────────────────────────────────────────
    //
    // Resolves the token by asking Grapifly (CommunicationTokenValidatorService) —
    // same validation used by GET /company-integrations/me. Accepted in two headers:
    //
    //   a. x-integration-token  — explicit header (preferred, used for /company-integrations/me)
    //   b. x-api-key            — when the value is not the admin key
    //                             Business App sends the integration token here when
    //                             calling POST /notifications/event.
    //
    // In both cases the resolved Communications companyId is stored in
    // authContext.companyId so controllers can use it as the effective companyId.
    const rawIntegration = this.resolveIntegrationTokenHeader(
      request,
      apiKeyHeader,
    );

    if (rawIntegration) {
      const headerSource = request.headers['x-integration-token']
        ? 'x-integration-token'
        : 'x-api-key';
      try {
        this.logger.log(
          `[step4] validating integration token from ${headerSource} ` +
            `route=${request.method} ${request.path}`,
        );
        const resolved =
          await this.communicationTokens.resolveCompanyByToken(rawIntegration);
        this.logger.log(
          `[step4] token valid — companyId=${resolved.companyId} companyKey=${resolved.companyKey} ` +
            `source=${headerSource}`,
        );
        (request as any).authContext = {
          actorType: 'apikey',
          keyId: 'integration-token',
          companyId: resolved.companyId,
        } satisfies AuthContext;
        return true;
      } catch {
        this.logger.warn(
          `[step4] invalid or expired integration token from ${headerSource} ` +
            `route=${request.method} ${request.path}`,
        );
        throw new UnauthorizedException('Invalid or expired integration token');
      }
    }

    // ── 5. No valid authentication found ─────────────────────────────────────
    throw new UnauthorizedException('Authentication required');
  }

  /**
   * Extracts the integration token from the request headers.
   * Priority: x-integration-token header, then x-api-key when it is NOT the admin key.
   * Returns null if neither header carries a candidate integration token.
   */
  private resolveIntegrationTokenHeader(
    request: Request,
    apiKeyHeader: string | undefined,
  ): string | null {
    const explicit = (
      request.headers['x-integration-token'] as string | undefined
    )?.trim();
    if (explicit) return explicit;

    // x-api-key fallback: only when the value differs from the admin key
    // (admin key was already handled in step 3 and would have returned true).
    if (apiKeyHeader?.trim()) {
      const adminKey = this.config.get<string>('RELAY_API_KEY');
      if (apiKeyHeader.trim() !== adminKey) {
        return apiKeyHeader.trim();
      }
    }

    return null;
  }

  /** Timing-safe string comparison — mismatched lengths short-circuit to false without leaking timing. */
  private secretsMatch(candidate: string, expected: string): boolean {
    const candidateBuf = Buffer.from(candidate);
    const expectedBuf = Buffer.from(expected);
    if (candidateBuf.length !== expectedBuf.length) return false;
    return timingSafeEqual(candidateBuf, expectedBuf);
  }
}
