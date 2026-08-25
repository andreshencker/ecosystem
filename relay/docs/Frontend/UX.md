# Frontend UX Architecture

| Field | Value |
|---|---|
| Last Updated | 2026-06-23 |
| Governs | `communications-front` |
| Decision baseline | [DEC-008](../Decisions/DEC-008-User-Company-Role-Lifecycle.md), [ADR-003](../Decisions/ADR-003-Top-Navigation-Simplification.md) |

> **Migration note (2026-06-23):** Merged from project `docs/Frontend/UX.md` (2026-06-15) and vault `Modules/Communication/Frontend/UX.md` (2026-06-14). §2 Navbar updated per [ADR-003 — Top Navigation Simplification](../Decisions/ADR-003-Top-Navigation-Simplification.md): env badge and role badge removed; tabs moved right. Example journeys updated to remove stale badge references. Vault's design principles and Global Interaction Patterns sections integrated.

---

## 1. Design Principles

1. **Clarity over cleverness.** Administrators need to complete tasks quickly. Every interaction must be immediately understandable without explanation.
2. **No silent access denial.** Unauthorized navigation produces a visible redirect, not a blank page or a 404.
3. **Consistent layout.** All portal pages share the same AppShell. Role-conditional content appears only within the content slot, not in the shell structure.
4. **Config-driven UI.** Sidebar and navbar adapt to role without any per-role conditional logic in components.
5. **No orphaned actions.** Actions the user cannot perform are not rendered, not disabled. Users never see a greyed-out button they cannot click.
6. **Progressive disclosure.** Lists show summaries. Details open on demand. Complex multi-step flows are broken into explicit steps.
7. **Honest state.** Loading, empty, error, and success states are never hidden. The UI always reflects what is actually happening.
8. **Backend alignment.** UI validation rules mirror backend constraints exactly. Required fields, enum values, and pagination limits are not invented by the frontend.
9. **Confirmation before destruction.** Every irreversible action (delete, deactivate, bulk update) requires explicit user confirmation.

---

## 2. Global Interaction Patterns

### Navigation

- Single-level sidebar navigation. No mega-menus, no deep nesting.
- Active route is clearly marked (see `Design-System.md` sidebar section).
- Breadcrumbs appear on all pages below the top level.
- Browser back button always works — no single-page-app traps.

### Keyboard Navigation

- Tab order follows visual reading order (top-to-bottom, left-to-right).
- All dialogs and drawers are focus-trapped (MUI default).
- Escape closes any open modal or drawer.
- Enter submits focused forms.

### Modals and Drawers

- Create and edit forms open in a right-side `<FormDrawer>`. Full-page navigation does not occur for CRUD operations.
- Destructive actions (delete, deactivate) open a `<ConfirmDialog>`, never proceed silently.
- Drawers are always dismissible via Escape, a Close button, or clicking the backdrop.

### Toast Notifications

- Success mutations produce a brief success toast (auto-dismiss 3s).
- Error mutations produce a persistent error toast with a dismissal button.
- Toasts are non-blocking; they never prevent continued interaction.

### Empty States

- List pages with no data show an `<EmptyState>` component with a contextual icon, message, and primary action.
- Filter results with no matches show a distinct empty state with a "Clear filters" action.

---

## 3. Navbar Design

> **Current implementation as of ADR-003 (2026-06-22).** The environment badge and role badge were removed. The Business App / Platform Admin tab switcher is right-aligned, before the user profile. See [ADR-003](../Decisions/ADR-003-Top-Navigation-Simplification.md) for the full rationale.

### 3.1 Architecture Constraint

The `Topbar` component accepts a `NavbarConfig` prop and renders purely from it. It contains no `if (role === …)` logic.

```ts
interface NavbarConfig {
  showCompanyName:     boolean;
  showRoleBadge:       boolean;   // field retained but no longer rendered by Topbar
  showEnvironmentBadge: boolean;  // field retained but no longer rendered by Topbar
  showCompanySwitcher: boolean;
  roleBadgeLabel:      string;    // retained for potential future use
}
```

> `showRoleBadge` and `showEnvironmentBadge` remain in the type for backwards compatibility, but `Topbar.tsx` does not render them. They are effectively dead config per ADR-003.

### 3.2 Current Navbar Layout

**All roles — general layout:**

```
[☰ mobile only]  [Company name — company roles only]  ──flex spacer──  [Business App | Platform Admin]  [● Name / email]
```

| Breakpoint | Behaviour |
|---|---|
| Desktop (md+, ≥900px) | Spacer fills space; tabs + full profile (avatar + name + email) visible |
| Tablet (sm, 600–899px) | Hamburger shown; tabs right; profile text visible |
| Mobile (xs, <600px) | Hamburger left; tabs right (`flexShrink: 0`); avatar only (name/email hidden) |

### 3.3 Platform Admin Navbar

```
[☰]  ──────────────────── spacer ────────────────────  [Business App | Platform Admin]  [● Name / email]
```

| Element | Value |
|---|---|
| Company name | Hidden (`showCompanyName: false`) |
| Environment badge | Not rendered (ADR-003) |
| Role badge | Not rendered (ADR-003) |
| Tab switcher | Shown — "Business App" / "Platform Admin" |
| User profile | Avatar + name + email (desktop); avatar only (mobile) |

### 3.4 Company-Scoped Roles Navbar

```
[☰]  [Company Name]  ──── spacer ────  [● Name / email]
```

| Element | Value |
|---|---|
| Company name | Shown |
| Environment badge | Not rendered |
| Role badge | Not rendered |
| Tab switcher | Not shown (single-mode navigation) |
| User profile | Avatar + name + email (desktop); avatar only (mobile) |

### 3.5 Navbar Matrix

| Element | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|
| Company name | ✗ | ✓ | ✓ | ✓ | ✓ |
| Role badge | ✗ (removed ADR-003) | ✗ | ✗ | ✗ | ✗ |
| Environment badge | ✗ (removed ADR-003) | ✗ | ✗ | ✗ | ✗ |
| Tab switcher | ✓ (Business App / Platform Admin) | ✗ | ✗ | ✗ | ✗ |
| Company switcher | ✗ | ✗ | ✗ | ✗ | ✗ |

---

## 4. Sidebar Design

### 4.1 Architecture Constraint

`Sidebar.tsx` receives `SidebarSection[]` from `getRoleConfig(role).sidebar` and renders them. It contains no role-specific logic.

```
Sidebar
  └── [section.label]
        └── [item.href, item.icon, item.label]  →  <SidebarItem active={pathname.startsWith(item.href)} />
```

### 4.2 Platform Admin Sidebar

> **Updated 2026-06-25 per [DEC-016](../Decisions/DEC-016-Navigation-Configuration-Flow.md).** Sidebar follows the communication platform configuration workflow order, not database or module structure.

`platform_admin` has dual-mode navigation. The sidebar shown depends on the active `NavMode` (see [ADR-001](../Decisions/ADR-001-Dual-Navigation-Strategy.md)).

**Business App mode:**
```
Overview
  ▪ Dashboard

Communication Setup
  ▪ My Company
  ▪ Theme
  ▪ Enabled Providers
  ▪ Credentials
  ▪ Domains
  ▪ Templates
  ▪ Events

Operations
  ▪ Test Notifications

Users
  ▪ Team

Settings
  ▪ Profile
```

**Platform Admin mode:**
```
Overview
  ▪ Dashboard

Platform
  ▪ Companies
  ▪ Platform Admins

Communication Catalog
  ▪ Channels
  ▪ Providers
  ▪ Provider Schemas
  ▪ Global Templates

Operations
  ▪ Provider Testing
  ▪ Failed Notifications
  ▪ Company Activity
  ▪ API Usage

Security
  ▪ Global Users
  ▪ Audit Logs
  ▪ Error Logs

Settings
  ▪ Profile
```

### 4.3 Company Owner Sidebar

```
Overview
  ▪ Dashboard

Communication Setup
  ▪ My Company          (/company)
  ▪ Theme               (/company/themes)
  ▪ Enabled Providers   (/company-channel-providers)
  ▪ Credentials         (/provider-credentials)
  ▪ Domains             (/domain-catalogue)
  ▪ Templates           (/layout-templates)
  ▪ Events              (/event-catalogue)

Operations
  ▪ Test Notifications

Users
  ▪ Team

Settings
  ▪ Profile
```

### 4.4 Company Admin Sidebar

Same navigation as company_owner. Ownership-specific actions are hidden via `PermissionGuard` (e.g. `canTransferOwnership`, `canEditCompany`), not via navigation removal.

### 4.5 Operator Sidebar

```
Overview
  ▪ Dashboard

Operations
  ▪ Test Notifications

Users
  ▪ Team

Settings
  ▪ Profile
```

### 4.6 Viewer Sidebar

```
Overview
  ▪ Dashboard

Users
  ▪ Team

Settings
  ▪ Profile
```

### 4.7 Sidebar Matrix

> Updated 2026-06-25 per DEC-016. Reports, Media, Storage removed from Business App navigation.

| Section | Item | platform_admin | company_owner | company_admin | operator | viewer |
|---|---|---|---|---|---|---|
| Overview | Dashboard | ✓ | ✓ | ✓ | ✓ | ✓ |
| Communication Setup | My Company | ✓ (BA) | ✓ | ✓ | ✗ | ✗ |
| Communication Setup | Theme | ✓ (BA) | ✓ | ✓ | ✗ | ✗ |
| Communication Setup | Enabled Providers | ✓ (BA) | ✓ | ✓ | ✗ | ✗ |
| Communication Setup | Credentials | ✓ (BA) | ✓ | ✓ | ✗ | ✗ |
| Communication Setup | Domains | ✓ (BA) | ✓ | ✓ | ✗ | ✗ |
| Communication Setup | Templates | ✓ (BA) | ✓ | ✓ | ✗ | ✗ |
| Communication Setup | Events | ✓ (BA) | ✓ | ✓ | ✗ | ✗ |
| Operations (BA) | Test Notifications | ✓ (BA) | ✓ | ✓ | ✓ | ✗ |
| Users | Team | ✓ (BA) | ✓ | ✓ | ✓ | ✓ |
| Platform (PA) | Companies | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Platform (PA) | Platform Admins | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Communication Catalog (PA) | Channels | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Communication Catalog (PA) | Providers | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Communication Catalog (PA) | Provider Schemas | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Communication Catalog (PA) | Global Templates | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Operations (PA) | Provider Testing | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Operations (PA) | Failed Notifications | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Operations (PA) | Company Activity | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Operations (PA) | API Usage | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Security | Global Users | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Security | Audit Logs | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Security | Error Logs | ✓ (PA) | ✗ | ✗ | ✗ | ✗ |
| Settings | Profile | ✓ | ✓ | ✓ | ✓ | ✓ |

> Key: BA = Business App mode only. PA = Platform Admin mode only.

---

## 5. Access Denial UX

### 5.1 Unauthorized Route

When `isRouteAllowed(role, pathname)` returns `false`:

- Middleware redirects to `getRoleConfig(role).landingPage` (silent redirect).
- No error message is shown (DEC-008 preferred behaviour: redirect, not block).

> **Gap (ROUTE-003):** Consider a brief "You don't have access to that page" toast before redirect, to avoid confusion on accidental navigation.

### 5.2 Permission Guard (Action Level)

When `<PermissionGuard allowed={canCreateCompany}>` wraps a button:

- The button is simply not rendered if the permission is false.
- The user never sees a disabled or greyed-out action they cannot perform.
- For read-only contexts (e.g. `viewer` on Templates), the entire edit/create toolbar is absent.

### 5.3 Empty State

If a page is accessible but the user's data set is empty:

- Show the `<EmptyState>` component with a contextual message and primary action.
- Do not show an error.

---

## 6. Loading States

| Context | Behaviour |
|---|---|
| Session hydration on page load | Full-page `<LoadingPage />` spinner until auth state is resolved |
| Data fetching | Skeleton or spinner within the content area |
| Mutations (create / update / delete) | Button loading state; optimistic update where safe |

---

## 7. Form UX

All forms use the `<FormDrawer>` pattern (right-side panel) for create/edit operations. Destructive operations (delete, deactivate) use `<ConfirmDialog>`.

> **Behaviour standard:** This section covers layout and component selection only. For the full mandatory behaviour specification — form lifecycle states, error mapping, mutation feedback, auth session handling, and the CRUD acceptance checklist — see **[Standards/Form-Behaviour.md](./Standards/Form-Behaviour.md)**.

| Topic | Where defined |
|---|---|
| Form field layout, spacing, validation visual | [Design-System.md §10](./Design-System.md) |
| Drawer and dialog dimensions, anatomy | [Design-System.md §11](./Design-System.md) |
| Toast and alert visual specification | [Design-System.md §12](./Design-System.md) |
| Form lifecycle, state machine, mandatory rules | [Standards/Form-Behaviour.md §1–§2](./Standards/Form-Behaviour.md) |
| Login form error messages and auth persistence | [Standards/Form-Behaviour.md §3](./Standards/Form-Behaviour.md) |
| CRUD screen required states and actions | [Standards/Form-Behaviour.md §4](./Standards/Form-Behaviour.md) |
| API error message catalogue | [Standards/Form-Behaviour.md §5](./Standards/Form-Behaviour.md) |
| Mutation feedback (create / update / delete) | [Standards/Form-Behaviour.md §6](./Standards/Form-Behaviour.md) |
| Session expiry, token refresh, logout | [Standards/Form-Behaviour.md §7](./Standards/Form-Behaviour.md) |
| Shared components and utilities | [Standards/Form-Behaviour.md §8](./Standards/Form-Behaviour.md) |
| CRUD page acceptance checklist | [Standards/Form-Behaviour.md §10](./Standards/Form-Behaviour.md) |

---

## 8. Company Context Display

The topbar displays company branding (name + optional logo) sourced from a React Query fetch of `GET /companies/:companyId`, where `companyId` comes from `authStore.companyId`.

| Role | Navbar left area | Data source |
|---|---|---|
| `platform_admin` (Business App) | "Grapifly" — platform company name + logo | `GET /companies/<grapifly_id>` |
| `platform_admin` (Platform Admin) | Same — platform company branding | Same |
| Company roles | Own company display name + logo | `GET /companies/<own_companyId>` |

**Implementation:** `AppShell` calls `useCompanyById(companyId)` and passes the result to `Topbar` as a `company: { name, logoUrl? }` prop. The topbar renders a logo image if `logoUrl` is set, otherwise shows an avatar with initials derived from the display name. The fetch is cached for 5 minutes by React Query.

> **Note:** `authStore.user.companyKey` is a slug (e.g. `grapifly`), not a display name. The `displayName` field (e.g. `Grapifly`) must always come from the company fetch, not the auth store.

---

## 9. Example User Journeys Per Role

### 9.1 platform_admin — Creating a Company and Owner

1. Logs in → lands on `/dashboard`.
2. Sidebar shows Business App mode — navigates to Companies → sees all companies in a table.
3. Clicks "Create Company" → fills `companyKey`, `displayName`, `timezone` → submits.
4. Navigates to Users → clicks "Invite User" → selects `company_owner`, enters email, selects company → submits.
5. The invited owner receives an email and sets their password.
6. Switches to Platform Admin mode via the topbar tab switcher to review audit logs.
7. Logs out → `/auth/login`.

### 9.2 company_owner — Onboarding the Company

1. Completes registration via `/auth/register` → receives verification email → verifies → auto-logged in.
2. Lands on `/dashboard` → Navbar shows company name.
3. Navigates to My Company → Credentials → adds provider credentials for the SMS channel.
4. Navigates to My Company → Domain Catalogue → adds permitted sending domains.
5. Navigates to Users → Team → invites `bob@acme.com` as `company_admin`.
6. Invites `carol@acme.com` as `operator`.
7. Navigates to Notifications → Test Notifications → sends a test notification.
8. Navigates to Reports → downloads usage report.

### 9.3 company_admin — Daily Management

1. Logs in → lands on `/dashboard` → Navbar shows company name.
2. Navigates to Users → Team → sees list of company users.
3. Attempts to invite a new `company_owner` → invite dialog does not show `company_owner` as an option (PermissionGuard hides it).
4. Invites `dave@acme.com` as `viewer`.
5. Creates a new layout template via My Company → Templates.
6. Navigates directly to `/api-keys` via URL → redirected to `/dashboard` (route guard).

### 9.4 operator — Operational Tasks

1. Logs in → lands on `/dashboard` → Navbar shows company name.
2. Sidebar shows only: Dashboard, Test Notifications, Reports, Media, Storage, Profile.
3. Navigates to Test Notifications → sends a test email via configured provider.
4. Uploads a media asset. Downloads a report.
5. Types `/users` into the address bar → redirected to `/dashboard`.

### 9.5 viewer — Read-Only Access

1. Logs in → lands on `/dashboard` → Navbar shows company name.
2. Sidebar shows only: Dashboard, Reports, Media, Profile.
3. Navigates to Reports → downloads a PDF report.
4. Types `/notifications/test` into address bar → redirected to `/dashboard`.

---

## 10. UX Gaps

| # | Gap | Status |
|---|---|---|
| UX-001 | Sidebar brand area static ("Communication Portal"). Company logo/name substitution not yet implemented. | Open |
| UX-002 | Role badge removed by ADR-003. | **Closed — ADR-003 (2026-06-22)** |
| UX-003 | Environment badge removed by ADR-003. | **Closed — ADR-003 (2026-06-22)** |
| ROUTE-003 | No 403/access-denied feedback — forbidden route navigations are silent redirects. | Open |
| CONT-003 | Registration must redirect to `/auth/login?registered=true` — no auto-login (DEC-009 Rev-2). | **Open — requires implementation** |
| CONT-006 | Notification Testing added to company_owner and company_admin sidebars. | **Resolved** |
