import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

/**
 * API key authentication guard.
 *
 * Phase 1A: skeleton only — always returns false (not authenticated).
 * GlobalAuthGuard calls this guard as a fallback after JWT validation.
 *
 * Full implementation in Phase 1B:
 *   1. Read x-api-key header
 *   2. Compute SHA-256 hash of the incoming key
 *   3. Look up the hash in Redis cache (TTL 300s), then fall back to MongoDB
 *   4. Validate status === 'active', check expiresAt
 *   5. Attach AuthContext { actorType: 'apikey', keyId, companyId } to request
 *   6. Increment usageCount asynchronously
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    // TODO Phase 1B: implement real API key validation
    return false;
  }

  /**
   * Attempt to authenticate via x-api-key header.
   * Returns the AuthContext if successful, null otherwise.
   * Used by GlobalAuthGuard to attempt API key auth.
   */
  async tryAuthenticate(_request: Request): Promise<null> {
    // TODO Phase 1B: hash key, cache lookup, db lookup, return AuthContext
    return null;
  }
}
