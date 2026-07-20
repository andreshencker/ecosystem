// Re-export canonical types so security-layer files can import from one place.
export type { UserRole, UserScope } from '../../../platform/users/schemas/user.schema';

import type { UserRole, UserScope } from '../../../platform/users/schemas/user.schema';

/**
 * Attached to every authenticated request as request.authContext.
 * Populated by GlobalAuthGuard from either a validated JWT or an API key lookup.
 *
 * Shape aligns with DEC-008 A1 JWT payload contract:
 *   { sub, role, scope, companyId, companyKey, type }
 */
export interface AuthContext {
  /** Whether the actor is a human user (JWT) or a machine client (API key). */
  actorType: 'user' | 'apikey';

  /** Present when actorType === 'user'. The modules User ObjectId. */
  userId?: string;

  /** Role of the authenticated user (DEC-008 A1). */
  role?: UserRole;

  /** Access scope — 'global' for platform_admin, 'company' for tenant users (DEC-008 A1). */
  scope?: UserScope;

  /** ObjectId of the user's company. Populated for all roles (DEC-008 A3). */
  companyId?: string | null;

  /** Denormalised company slug. */
  companyKey?: string | null;

  /**
   * @deprecated Use companyId instead. Retained for backward compatibility with
   * GlobalAuthGuard / JwtStrategy while they are being migrated to emit the new
   * JWT payload shape (role + scope + companyId + companyKey).
   */
  organizationId?: string;

  /** Present when actorType === 'apikey'. The ApiKey document ObjectId. */
  keyId?: string;
}
