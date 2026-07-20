import { ACCESS_TOKEN_COOKIE } from './constants';

/**
 * Writes the access token to a cookie so Next.js middleware can read it
 * for server-side route guarding (ROUTE-001 resolution — partial, pending
 * full JWT payload migration in DEC-008 A3.10).
 *
 * Not HttpOnly — the cookie must be readable by the browser to allow
 * client-side cookie clearing on logout. Full HttpOnly migration is
 * tracked under AP-012.
 */
export function writeAuthCookie(token: string, expiresInSeconds: number): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${ACCESS_TOKEN_COOKIE}=${token}; path=/; max-age=${expiresInSeconds}; SameSite=Lax`;
}

export function clearAuthCookie(): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${ACCESS_TOKEN_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
}
