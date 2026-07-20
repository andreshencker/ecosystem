/**
 * Attached to every authenticated request as request.authContext.
 * Populated by GlobalAuthGuard from either a validated JWT or an API key lookup.
 */
export interface AuthContext {
  /** Whether the actor is a human user (JWT) or a machine client (API key). */
  actorType: 'user' | 'apikey';

  /** Present when actorType === 'user'. The modules User ObjectId. */
  userId?: string;

  /**
   * The organization this request is scoped to.
   * Always present for 'apikey' actors. Present for 'user' actors after
   * an organization context header is resolved (Phase 1B).
   */
  organizationId?: string;

  /** Present when actorType === 'apikey'. The ApiKey document ObjectId. */
  keyId?: string;
}
