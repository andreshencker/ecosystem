import type { UserRole } from '@/types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Edge Runtime compatible — no React, no MUI imports.
//
// Single source of truth for:
//   - middleware.ts   (Layer 2 route authorization)
//   - role-config.ts  (RoleConfig.allowedRoutes + getLandingPage)
// ─────────────────────────────────────────────────────────────────────────────

export const ALLOWED_ROUTES: Record<UserRole, string[]> = {

  // platform_admin has access to everything.
  platform_admin: ['*'],

  // business_owner — full company access.
  business_owner: [
    '/dashboard',
    '/customers',
    '/contracts',
    '/shifts',
    '/billing',
    '/users',
    '/settings/company',
    '/settings/profile',
    '/settings/communications',
    '/settings/communication-purposes',
    '/settings/communication-events',
    '/settings/calendar',
  ],

  // business_admin — same routes as business_owner; destructive actions hidden via permissions.
  business_admin: [
    '/dashboard',
    '/customers',
    '/contracts',
    '/shifts',
    '/billing',
    '/users',
    '/settings/company',
    '/settings/profile',
    '/settings/communications',
    '/settings/communication-purposes',
    '/settings/communication-events',
    '/settings/calendar',
  ],

  // accountant — financial focus; read-only customer access.
  accountant: [
    '/dashboard',
    '/customers',
    '/contracts',
    '/shifts',
    '/billing',
    '/settings/profile',
  ],

  // staff — operational access.
  staff: [
    '/dashboard',
    '/customers',
    '/contracts',
    '/shifts',
    '/settings/profile',
  ],

  // viewer — read-only.
  viewer: [
    '/dashboard',
    '/customers',
    '/settings/profile',
  ],
};

export const LANDING_PAGES: Record<UserRole, string> = {
  platform_admin: '/dashboard',
  business_owner: '/dashboard',
  business_admin: '/dashboard',
  accountant:     '/dashboard',
  staff:          '/dashboard',
  viewer:         '/dashboard',
};

export function isRouteAllowed(role: UserRole, pathname: string): boolean {
  const routes = ALLOWED_ROUTES[role] ?? [];
  if (routes.includes('*')) return true;
  return routes.some(
    (route) => pathname === route || pathname.startsWith(route + '/'),
  );
}

export function getLandingPage(role: UserRole): string {
  return LANDING_PAGES[role] ?? '/dashboard';
}
