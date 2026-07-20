export const REFRESH_TOKEN_KEY = 'comm_portal_rt';
// Persists the authenticated User object so it can be restored after F5
// without an extra /users/me round-trip (fast-path session restoration).
export const AUTH_USER_KEY = 'comm_portal_user';
// Reserved for the future cookie-based session strategy (ROUTE-001).
// The middleware reads this cookie to perform server-side route guarding.
// Until AP-012 / the session-cookie migration lands, no cookie with this
// name is written — middleware falls back to allowing unauthenticated state.
export const ACCESS_TOKEN_COOKIE = 'comm_portal_at';

export const SIDEBAR_WIDTH = 260;
export const SIDEBAR_COLLAPSED_WIDTH = 64;
export const TOPBAR_HEIGHT = 64;
