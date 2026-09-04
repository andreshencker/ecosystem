import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';

export interface EcosystemAuthContext {
  /** Calling app key — canonical header, else the legacy :appKey path param. */
  appKey: string | undefined;
  /** Service secret — canonical header, else the legacy x-grapifly-sso-secret. */
  secret: string | undefined;
  /** Acting grapiflyUserId — canonical header, else legacy x-grapifly-user-id. */
  actor: string | undefined;
}

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/**
 * Resolves the Ecosystem Internal API caller identity from a request,
 * preferring the canonical `x-ecosystem-*` headers and falling back to the
 * pre-standard `:appKey` path param + `x-grapifly-*` headers.
 * See docs/architecture/ecosystem-internal-api.md.
 */
export const EcosystemAuth = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): EcosystemAuthContext => {
    const req = ctx.switchToHttp().getRequest<Request>();
    const paramAppKey =
      req.params && typeof req.params.appKey === 'string' ? req.params.appKey : undefined;
    return {
      appKey: header(req, 'x-ecosystem-app') ?? paramAppKey,
      secret: header(req, 'x-ecosystem-secret') ?? header(req, 'x-grapifly-sso-secret'),
      actor: header(req, 'x-ecosystem-actor') ?? header(req, 'x-grapifly-user-id'),
    };
  },
);
