import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { ApplicationAssignmentsService } from '../access/application-assignments.service';

export interface EcosystemRequest extends Request {
  /** The verified calling app key, e.g. 'jtrade'. */
  ecosystemApp?: string;
  /** The grapiflyUserId the call is made on behalf of, when supplied. */
  ecosystemActor?: string;
}

/**
 * Guards `/internal/*` machine-to-machine routes per the Ecosystem Internal API
 * standard (docs/architecture/ecosystem-internal-api.md).
 *
 * Canonical:  x-ecosystem-app + x-ecosystem-secret  (+ x-ecosystem-actor)
 * Legacy:     :appKey path param + x-grapifly-sso-secret  (+ x-grapifly-user-id)
 *
 * The secret is checked against the app's serviceSecretHash in the catalogue.
 */
@Injectable()
export class EcosystemAppGuard implements CanActivate {
  constructor(private readonly assignments: ApplicationAssignmentsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<EcosystemRequest>();

    const appKey =
      header(req, 'x-ecosystem-app') ??
      (typeof req.params?.appKey === 'string' ? req.params.appKey : undefined);
    const secret =
      header(req, 'x-ecosystem-secret') ?? header(req, 'x-grapifly-sso-secret');

    if (!appKey) {
      throw new ForbiddenException('Missing x-ecosystem-app');
    }

    // Throws ForbiddenException on an unknown app or a bad/missing secret.
    await this.assignments.assertAppClient(appKey.toLowerCase(), secret);

    req.ecosystemApp = appKey.toLowerCase();
    req.ecosystemActor =
      header(req, 'x-ecosystem-actor') ?? header(req, 'x-grapifly-user-id');
    return true;
  }
}

function header(req: Request, name: string): string | undefined {
  const value = req.headers[name];
  if (Array.isArray(value)) return value[0];
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}
