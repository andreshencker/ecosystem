import type { UserRole } from '@/types/api';

// ─────────────────────────────────────────────────────────────────────────────
// Edge Runtime compatible — no React, no MUI imports.
//
// Single source of truth for:
//   - middleware.ts   (Layer 2 route authorization — Edge Runtime)
//   - role-config.ts  (RoleConfig.allowedRoutes + getLandingPage)
//
// ══════════════════════════════════════════════════════════════════════════════
// SINGLE BUSINESS APP MODEL
//
// All roles use the same Business App pages.  Actions within each page are
// controlled by permissions (UserPermissions), not by page duplication.
//
// platform_admin uses a dual-mode sidebar:
//   - Business App tab  → same operational pages as company_owner/admin
//   - Platform Admin tab → global admin/support pages
//
// There is ONE page per business resource.  platform_admin accesses all
// Business App routes in addition to Platform Admin-only routes.
// ══════════════════════════════════════════════════════════════════════════════
//
// ┌─────────────────────────────────────────────────────────────────────────┐
// │  FINAL ROLE → ROUTE MATRIX                                              │
// │                                pa   co   ca   op   vi                  │
// │  PLATFORM MANAGEMENT (PA)                                               │
// │  /dashboard                    ✓    ✓    ✓    ✓    ✓                   │
// │  /companies          (list)    ✓    ✗    ✗    ✗    ✗                   │
// │  /modules-admins              ✓    ✗    ✗    ✗    ✗   NEW             │
// │  /channels                     ✓    ✗    ✗    ✗    ✗                   │
// │  /providers                    ✓    ✗    ✗    ✗    ✗                   │
// │  /global-templates             ✓    ✗    ✗    ✗    ✗   NEW             │
// │                                                                         │
// │  SUPPORT / OPERATIONS (PA)                                              │
// │  /users              (global)  ✓    ✓    ✓    ✗    ✗   dual-surface   │
// │  /audit-logs                   ✓    ✗    ✗    ✗    ✗                   │
// │  /support            (prefix)  ✓    ✗    ✗    ✗    ✗   NEW             │
// │    /support/failed-notifications                                        │
// │    /support/api-usage                                                   │
// │    /support/company-activity                                            │
// │    /support/error-logs                                                  │
// │                                                                         │
// │  COMPANY BUSINESS VIEW (company roles)                                  │
// │  /company            (own)     ✗    ✓    ✓    ✗    ✗                   │
// │  /company-channel-providers    ✗    ✓    ✓    ✗    ✗                   │
// │  /provider-credentials         ✗    ✓    ✓    ✗    ✗                   │
// │  /layout-templates             ✗    ✓    ✓    ✗    ✗                   │
// │  /domain-catalogue             ✗    ✓    ✓    ✗    ✗                   │
// │  /event-catalogue              ✗    ✓    ✓    ✗    ✗                   │
// │  /notifications/test           ✗    ✓    ✓    ✓    ✗                   │
// │  /files/reports                ✗    ✓    ✓    ✓    ✓                   │
// │  /files/media                  ✗    ✓    ✓    ✓    ✓                   │
// │  /files/storage                ✗    ✓    ✓    ✓    ✗                   │
// │                                                                         │
// │  UNIVERSAL                                                              │
// │  /settings/profile             ✓    ✓    ✓    ✓    ✓                   │
// │                                                                         │
// │  KEY: pa=platform_admin  co=company_owner  ca=company_admin             │
// │       op=operator  vi=viewer                                             │
// └─────────────────────────────────────────────────────────────────────────┘
// ─────────────────────────────────────────────────────────────────────────────

export const ALLOWED_ROUTES: Record<UserRole, string[]> = {

  // ── platform_admin ────────────────────────────────────────────────────────
  // Global scope — all routes are accessible.
  // '*' is handled by isRouteAllowed as a wildcard.
  platform_admin: ['*'],

  // ── company_owner ─────────────────────────────────────────────────────────
  company_owner: [
    '/dashboard',
    '/company',
    '/users',
    '/company-channel-providers',
    '/provider-credentials',
    '/company/integrations',
    '/layout-templates',
    '/domain-catalogue',
    '/event-catalogue',
    '/document-domain-catalogue',
    '/document-catalogue',
    '/calendar',
    '/payments',
    '/accounting',
    '/notifications/test',
    '/files/reports',
    '/files/media',
    '/files/storage',
    '/settings/profile',
  ],

  // ── company_admin ─────────────────────────────────────────────────────────
  // Same routes as company_owner; ownership/edit-company actions hidden via permissions.
  company_admin: [
    '/dashboard',
    '/company',
    '/users',
    '/company-channel-providers',
    '/provider-credentials',
    '/company/integrations',
    '/layout-templates',
    '/domain-catalogue',
    '/event-catalogue',
    '/document-domain-catalogue',
    '/document-catalogue',
    '/calendar',
    '/payments',
    '/accounting',
    '/notifications/test',
    '/files/reports',
    '/files/media',
    '/files/storage',
    '/settings/profile',
  ],

  // ── operator ──────────────────────────────────────────────────────────────
  operator: [
    '/dashboard',
    '/users',           // read-only view of company team
    '/notifications/test',
    '/files/reports',
    '/files/media',
    '/files/storage',
    '/settings/profile',
  ],

  // ── viewer ────────────────────────────────────────────────────────────────
  viewer: [
    '/dashboard',
    '/users',           // read-only view of company team
    '/files/reports',
    '/files/media',
    '/settings/profile',
  ],
};

export const LANDING_PAGES: Record<UserRole, string> = {
  platform_admin: '/dashboard',
  company_owner:  '/dashboard',
  company_admin:  '/dashboard',
  operator:       '/dashboard',
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
