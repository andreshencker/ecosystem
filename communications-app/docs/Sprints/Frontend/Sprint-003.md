---
tags: [sprint, communication, frontend, implementation]
sprint: 3
start-date: 2026-06-14
status: Completed
goal: Phase B kick-off — Companies single-page CRUD + shared infrastructure (RBAC + responsive DataTable + form components)
agent: communication-frontend-agent
---

# Frontend Sprint-003 — Companies Module

## Goal

Deliver the Companies module (FB-001) as a **single-page CRUD** — all list, create, view, edit, and delete operations live on one route with drawers and dialogs. Along with the shared infrastructure required by all subsequent Phase B modules: RBAC permission layer, responsive DataTable (desktop DataGrid + mobile card list), and form components.

**Agent:** Communication Frontend Agent
**Phase:** B — Core Features
**Backlog item:** [[../Backlog#FB-001]]
**Prerequisite:** Phase A audit cleared — see [[../Audits/Audit-2026-06-14]]

**Sprint-003 is approved and In Progress.**

---

## Architecture Correction — Single-Page CRUD

**Decision (approved before implementation):** All Companies CRUD operations are on one page. No sub-routes are created.

| Route | Created? | Reason |
|---|---|---|
| `/companies` | ✅ Created | Single-page CRUD: list + all drawers/dialogs |
| `/companies/new` | ❌ Not created | Create lives in a drawer on `/companies` |
| `/companies/[id]` | ❌ Not created | View/detail lives in a drawer on `/companies` |
| `/companies/[id]/edit` | ❌ Not created | Edit lives in a drawer on `/companies` |

**URL clarification:** The Next.js `(portal)` route group does not add URL segments. The route `app/(portal)/companies/page.tsx` produces the URL `/companies` (not `/portal/companies`). The word "portal" refers to the authenticated section, not a URL prefix.

**Page state machine:**

```
drawerMode: 'none' | 'create' | 'view' | 'edit'
selectedCompany: Company | null

deleteTarget: Company | null   ← ConfirmDialog trigger
deactivateTarget: Company | null ← ConfirmDialog trigger
```

All drawers and dialogs are rendered inside the single page component.

---

## Role Behavior — Companies Module

> Detailed permission matrix in [[../Architecture]] and [[../Routes]].

| Action | Platform Admin | Company Admin | Company User | Viewer |
|---|---|---|---|---|
| `/companies` list — view all companies | ✅ | ❌ auto-redirect | ❌ auto-redirect | ❌ auto-redirect |
| `/companies/[key]` — view own company | ✅ | ✅ | ✅ | ✅ |
| "New Company" button visible | ✅ | ❌ hidden | ❌ hidden | ❌ hidden |
| Create company (API call) | ✅ | ❌ | ❌ | ❌ |
| "Edit" action visible | ✅ (any company) | ✅ (own company only) | ❌ hidden | ❌ hidden |
| Edit company (all fields) | ✅ | ❌ | ❌ | ❌ |
| Edit company (limited fields) | n/a | ✅ (displayName, legalName, tagline, timezone) | ❌ | ❌ |
| "Deactivate" toggle visible | ✅ | ❌ hidden | ❌ hidden | ❌ hidden |
| "Delete" action visible | ✅ | ❌ hidden | ❌ hidden | ❌ hidden |
| Delete company (API call) | ✅ | ❌ | ❌ | ❌ |
| Companies sidebar link | All companies | Own company | Own company | Own company |

**Auto-redirect rule:** When a non-Platform-Admin visits `/companies`, the portal redirects them to `/companies/[user.companyKey]`. There is no pagination, no filter bar — they land directly on their company's detail page.

**Field restriction for Company Admin:** `companyKey` is always read-only in edit mode. `isActive` toggle is hidden for Company Admin — only Platform Admin can activate or deactivate a company.

**Backend dependency:** Role and `companyId` must be present in the auth response (`/auth/login`, `/auth/refresh`). If the backend does not yet return `role`, implement with a temporary development default of `platform_admin` — clearly marked with `// TODO: remove dev default`.

---

## Post-Sprint RBAC Audit (2026-06-14)

A full RBAC and route protection audit was conducted after this sprint's implementation. Key findings:

| Finding | Impact |
|---|---|
| Backend has no `role` field on User — never returned in auth responses | `usePermissions()` always uses dev fallback; real RBAC cannot function |
| Communication endpoints reject JWT Bearer tokens — use API key only | Companies page API calls will fail 401 at runtime with real backend |
| `/auth/me` returns only `{ actorType, userId }` — not a full user profile | Cannot resolve role on page refresh |
| No RolesGuard exists on any backend endpoint | Even with role, endpoints have no authorization checks |
| Frontend has no page-level permission guard — only sidebar hiding | Any authenticated user can manually navigate to any portal URL |

Full analysis: [[../Decisions/DEC-003 Role Navigation and Route Protection]]

**Sprint-003 implementation is architecturally correct. Backend changes in DEC-003 are required before end-to-end RBAC validation can be performed.**

---

## Sprint Items

### FB-001-0 — RBAC Foundation

| Field | Value |
|---|---|
| **ID** | FB-001-0 |
| **Priority** | P0 — blocks all role-aware rendering in this sprint |
| **Effort** | S |
| **Status** | Not started |
| **Files** | `types/permissions.ts`, `hooks/usePermissions.ts`, `components/shared/PermissionGuard.tsx`, `stores/auth.store.ts` (role field), `types/api.ts` (User.role field) |

Establishes the permission layer that all Companies module components (and all future Phase B modules) depend on.

**`types/permissions.ts`:**
```typescript
export type UserRole = 'platform_admin' | 'company_admin' | 'company_user' | 'viewer';

export interface UserPermissions {
  canViewAllCompanies: boolean;
  canCreateCompany: boolean;
  canEditCompany: boolean;
  canDeleteCompany: boolean;
  canDeactivateCompany: boolean;
  canManageThemes: boolean;
  canViewChannels: boolean;
  canManageProviders: boolean;
  canManageCredentials: boolean;
  canManageDomains: boolean;
  canManageEvents: boolean;
  canTestNotifications: boolean;
  canManageTemplates: boolean;
  canUploadMedia: boolean;
  canManageStorage: boolean;
  canGenerateReports: boolean;
  canAccessPlatformSettings: boolean;
}
```

**`types/api.ts` — add `role` and `companyId` to User:**
```typescript
export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  isEmailVerified: boolean;
  role: UserRole;
  companyId?: string | null;   // null for platform_admin
  createdAt?: string;
  updatedAt?: string;
}
```

**`hooks/usePermissions.ts`:**
```typescript
export function usePermissions(): UserPermissions {
  const role = useAuthStore((s) => s.user?.role ?? null);
  return derivePermissions(role);
}

function derivePermissions(role: UserRole | null): UserPermissions {
  const isAdmin = role === 'platform_admin';
  const isCompanyAdmin = role === 'company_admin';
  const isUser = role === 'company_user';

  return {
    canViewAllCompanies:       isAdmin,
    canCreateCompany:          isAdmin,
    canEditCompany:            isAdmin || isCompanyAdmin,
    canDeleteCompany:          isAdmin,
    canDeactivateCompany:      isAdmin,
    canManageThemes:           isAdmin || isCompanyAdmin,
    canViewChannels:           isAdmin,
    canManageProviders:        isAdmin,
    canManageCredentials:      isAdmin || isCompanyAdmin,
    canManageDomains:          isAdmin || isCompanyAdmin,
    canManageEvents:           isAdmin || isCompanyAdmin,
    canTestNotifications:      isAdmin || isCompanyAdmin || isUser,
    canManageTemplates:        isAdmin || isCompanyAdmin,
    canUploadMedia:            isAdmin || isCompanyAdmin || isUser,
    canManageStorage:          isAdmin || isCompanyAdmin,
    canGenerateReports:        true,   // all roles
    canAccessPlatformSettings: isAdmin,
  };
}
```

**`components/shared/PermissionGuard.tsx`:**
```typescript
interface PermissionGuardProps {
  allowed: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function PermissionGuard({ allowed, children, fallback = null }: PermissionGuardProps) {
  if (!allowed) return <>{fallback}</>;
  return <>{children}</>;
}
```

Export `PermissionGuard` from `components/shared/index.ts`.

**Acceptance criteria:**
- [ ] `types/permissions.ts` created with `UserRole` and `UserPermissions`
- [ ] `User` interface in `types/api.ts` includes `role` and optional `companyId`
- [ ] `usePermissions()` returns correct flags for each of the four roles (verify with unit test or manual console check)
- [ ] `PermissionGuard` renders children when `allowed=true`, renders fallback/null when `allowed=false`
- [ ] `PermissionGuard` exported from `components/shared/index.ts`

---

### FB-001-a — DataTable Shared Component (Responsive)

| Field | Value |
|---|---|
| **ID** | FB-001-a |
| **Priority** | P0 — blocks all list pages |
| **Effort** | M (increased from S due to responsive card view) |
| **Status** | Not started |
| **Files** | `components/shared/DataTable.tsx`, `components/shared/index.ts` |

Responsive data table. Renders as MUI X DataGrid on desktop/tablet (≥ 600px) and as a stacked card list on mobile (< 600px). Breakpoint detection is internal — callers pass the same props on all screen sizes.

**Full interface** (from `Components.md`):

```typescript
interface MobileCardField<T> {
  field: keyof T;
  label?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

interface MobileCardConfig<T> {
  primaryText: keyof T | ((row: T) => string);
  secondaryText?: keyof T | ((row: T) => string);
  badge?: (row: T) => React.ReactNode;
  fields: MobileCardField<T>[];
}

interface DataTableProps<T> {
  columns: GridColDef<T>[];
  getRowId?: (row: T) => string;
  checkboxSelection?: boolean;
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onRowClick?: (row: T) => void;
  rowActions?: (row: T) => React.ReactNode;
  loading?: boolean;
  error?: Error | null;
  emptyState?: React.ReactNode;
  noRowsLabel?: string;
  filterSlot?: React.ReactNode;
  mobileCardConfig?: MobileCardConfig<T>;
}
```

**Desktop mode (≥ sm = 600px):**
- MUI X DataGrid Community, `paginationMode="server"`
- `rowActions` rendered as icon buttons on row hover (right column)
- `filterSlot` renders above the DataGrid
- `loading`: DataGrid built-in skeleton
- `error`: renders `<QueryError>` replacing the grid
- Empty: renders `emptyState` prop or `<EmptyState noRowsLabel={noRowsLabel}>`

**Mobile mode (< sm = 600px):**
- Renders a `Stack` of card components, one per row
- Card anatomy per [[../Design-System]] section 9a:
  - Header: `primaryText` (left) + `badge` (right)
  - Subtitle: `secondaryText` below header
  - Body: `fields` rendered as two-column label/value rows
  - Footer: `rowActions(row)` rendered as always-visible icon buttons
- Tap on card body (header + body) → `onRowClick`
- `filterSlot` renders above cards (stacks vertically via MUI `Stack`)
- `loading`: card-shaped `Skeleton` elements (~120px height each, 3 shown)
- `error`: same `<QueryError>` centered in card area
- Pagination: `TablePagination` component below cards

**Implementation notes:**
- Breakpoint detection: `const isMobile = useMediaQuery(theme.breakpoints.down('sm'))`
- Card is an internal sub-component (`MobileCard`) — not exported separately
- `rowActions` must return MUI `IconButton` elements (small size) — same node used in both modes
- If `mobileCardConfig` is absent, DataGrid renders at all breakpoints (for non-CRUD tables)
- `getRowId` defaults to `(row) => (row as { id: string }).id`

**Acceptance criteria:**
- [ ] Desktop: DataGrid renders with columns, pagination, loading skeleton, empty state, error state
- [ ] Desktop: `rowActions` appear on row hover
- [ ] Desktop: `filterSlot` renders above grid
- [ ] Mobile: card list renders with `primaryText`, `secondaryText`, `badge`, `fields`
- [ ] Mobile: `rowActions` always visible in card footer (not hover-dependent)
- [ ] Mobile: tap on card body triggers `onRowClick`
- [ ] Mobile: `filterSlot` renders above card list, inputs full-width
- [ ] Mobile: `loading` shows 3 card-shaped skeletons
- [ ] Mobile: `error` shows `QueryError` centered
- [ ] Mobile: `empty` shows `emptyState` or `EmptyState` centered
- [ ] Mobile: `TablePagination` renders below cards with same callbacks
- [ ] Both: page size options `[25, 50, 100]`, default 50
- [ ] Both: `PermissionGuard`-wrapped `rowActions` hide correctly by role
- [ ] Export added to `components/shared/index.ts`
- [ ] `MobileCardConfig` and `MobileCardField` types exported from `types/` or `components/shared/DataTable.tsx`

---

### FB-001-b — Shared Form Infrastructure

| Field | Value |
|---|---|
| **ID** | FB-001-b |
| **Priority** | P0 — blocks all create/edit pages |
| **Effort** | S |
| **Status** | Not started |
| **Files** | `components/shared/ControlledTextField.tsx`, `ControlledSelect.tsx`, `ControlledSwitch.tsx`, `FormDrawer.tsx`, `FormError.tsx` |

Controlled input wrappers for React Hook Form, and a `FormDrawer` for the create/edit pattern used across all Phase B modules.

**ControlledTextField** (`Controller` wrapper for MUI `TextField`):
```typescript
interface ControlledTextFieldProps {
  name: string;
  control: Control<any>;           // eslint-disable-line @typescript-eslint/no-explicit-any
  label: string;
  type?: string;
  required?: boolean;
  multiline?: boolean;
  rows?: number;
  helperText?: string;
  disabled?: boolean;
}
```

**ControlledSelect** (`Controller` wrapper for MUI `Select` + `MenuItem`):
```typescript
interface ControlledSelectProps {
  name: string;
  control: Control<any>;
  label: string;
  options: { value: string; label: string }[];
  required?: boolean;
  disabled?: boolean;
}
```

**ControlledSwitch** (`Controller` wrapper for MUI `FormControlLabel` + `Switch`):
```typescript
interface ControlledSwitchProps {
  name: string;
  control: Control<any>;
  label: string;
  disabled?: boolean;
}
```

**FormError** — renders a field-level error string from RHF `FieldError`:
```typescript
interface FormErrorProps { message?: string; }
```

**FormDrawer** — MUI `Drawer` (right-side panel, 480px) for create/edit forms:
```typescript
interface FormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  actions?: React.ReactNode;   // form submit/cancel buttons
  loading?: boolean;
}
```

**Acceptance criteria:**
- [ ] All 4 controlled input components wrap `Controller` correctly
- [ ] Errors are displayed as `helperText` using `FieldError.message`
- [ ] `FormDrawer` is 480px wide, has title, children, action slots, and close button
- [ ] All components exported from `components/shared/index.ts`
- [ ] No `any` prop types except where `Control<any>` is unavoidable (documented)

---

### FB-001-c — Companies API Layer

| Field | Value |
|---|---|
| **ID** | FB-001-c |
| **Priority** | P0 — blocks all Companies pages |
| **Effort** | S |
| **Status** | Not started |
| **Files** | `hooks/api/useCompanies.ts`, `lib/schemas/company.schema.ts`, `lib/schemas/index.ts` |

**Backend endpoints consumed** (from `Backend/API.md`):

| Method | Path | Used by |
|---|---|---|
| `GET` | `/companies` | List page |
| `GET` | `/companies/by-key/:companyKey` | Detail page |
| `POST` | `/companies/json` | Create form (JSON payload) |
| `PATCH` | `/companies/:companyKey` | Edit form |
| `DELETE` | `/companies/:companyKey` | Delete action |

**`hooks/api/useCompanies.ts`** — TanStack Query hooks:

```typescript
// Query key: ['companies', params]
function useCompanies(params: PaginationParams & { active?: boolean }): UseQueryResult<PaginatedResponse<Company>>

// Query key: ['companies', companyKey]
function useCompany(companyKey: string): UseQueryResult<Company>

// Mutation — invalidates ['companies'] on success
function useCreateCompanyMutation(): UseMutationResult<Company, unknown, CreateCompanyDto>

// Mutation — invalidates ['companies'] and ['companies', companyKey] on success
function useUpdateCompanyMutation(companyKey: string): UseMutationResult<Company, unknown, UpdateCompanyDto>

// Mutation — invalidates ['companies'] on success
function useDeleteCompanyMutation(): UseMutationResult<void, unknown, string>
```

**`lib/schemas/company.schema.ts`** — Zod schemas for create and edit forms:

```typescript
export const createCompanySchema = z.object({
  companyKey: z.string().min(2).max(32).regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only'),
  displayName: z.string().min(1).max(100),
  legalName: z.string().optional(),
  tagline: z.string().optional(),
  timezone: z.string().min(1),
});
export type CreateCompanyDto = z.infer<typeof createCompanySchema>;

export const updateCompanySchema = createCompanySchema.partial().extend({
  isActive: z.boolean().optional(),
});
export type UpdateCompanyDto = z.infer<typeof updateCompanySchema>;
```

**Acceptance criteria:**
- [ ] `useCompanies` returns `PaginatedResponse<Company>` — query key includes params
- [ ] `useCompany(companyKey)` fetches by slug
- [ ] All mutations invalidate the correct query keys on success
- [ ] Zod schemas match the backend DTOs
- [ ] `lib/schemas/index.ts` barrel created

---

### FB-001-d — Companies List Page

| Field | Value |
|---|---|
| **ID** | FB-001-d |
| **Priority** | P1 |
| **Effort** | S |
| **Status** | Not started |
| **Files** | `app/(portal)/companies/page.tsx`, sidebar update |

**UI spec:**
- `PageHeader` title "Companies", count from `total`, action button "New Company" → opens create drawer
- `DataTable` with columns (desktop): Display Name, Company Key, Timezone, Status (`StatusBadge`), Created At
- Row click → navigate to `/companies/[companyKey]`
- Pagination state in URL search params (`page`, `pageSize`)
- Empty state: "No companies yet. Create your first company." with "New Company" action (role-guarded)

**Responsive — Companies `mobileCardConfig`:**

```typescript
const companiesMobileCardConfig: MobileCardConfig<Company> = {
  primaryText: 'displayName',
  secondaryText: 'companyKey',
  badge: (row) => <StatusBadge active={row.isActive} size="small" />,
  fields: [
    { field: 'timezone', label: 'Timezone' },
    {
      field: 'createdAt',
      label: 'Created',
      render: (v) => new Date(v as string).toLocaleDateString(),
    },
  ],
};
```

This config is defined in `app/(portal)/companies/page.tsx` and passed as `mobileCardConfig` to `DataTable`. No mobile-specific page or logic.

**`rowActions` for Companies (both desktop and mobile):**
```tsx
rowActions={(row) => (
  <>
    <PermissionGuard allowed={canEditCompany}>
      <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(row); }}>
        <EditOutlined fontSize="small" />
      </IconButton>
    </PermissionGuard>
    <PermissionGuard allowed={canDeleteCompany}>
      <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); openDelete(row); }}>
        <DeleteOutlineOutlined fontSize="small" />
      </IconButton>
    </PermissionGuard>
  </>
)}
```

`e.stopPropagation()` prevents the row/card tap from triggering `onRowClick` when an action button is clicked.

**Role behavior on this page:**
- **Platform Admin:** Full list, all companies, "New Company" button visible.
- **Company Admin / User / Viewer:** On mount, read `user.companyId` from auth store → call `GET /companies/by-key/[companyKey]` to resolve key → `router.replace('/companies/[companyKey]')`. The list is never rendered for these roles.

```tsx
// In page component, before rendering the list:
const { canViewAllCompanies } = usePermissions();
const companyKey = useAuthStore(s => s.user?.companyKey);

useEffect(() => {
  if (!canViewAllCompanies && companyKey) {
    router.replace(`/companies/${companyKey}`);
  }
}, [canViewAllCompanies, companyKey]);
```

"New Company" button uses `PermissionGuard`:
```tsx
<PermissionGuard allowed={canCreateCompany}>
  <Button onClick={openDrawer}>New Company</Button>
</PermissionGuard>
```

**Sidebar update:** Add Companies link to Sidebar navigation. The link destination adapts:
- Platform Admin: `/companies`
- All other roles: `/companies/[user.companyKey]`

```typescript
// Sidebar derives href from permissions + companyKey
const { canViewAllCompanies } = usePermissions();
const companyKey = useAuthStore(s => s.user?.companyKey);
const companiesHref = canViewAllCompanies ? '/companies' : `/companies/${companyKey}`;
{ href: companiesHref, icon: BusinessOutlinedIcon, label: 'Companies' }
```

**Acceptance criteria:**
- [ ] Platform Admin sees paginated list of all companies
- [ ] Non-Platform-Admin is redirected to own company detail on mount
- [ ] "New Company" button visible only for Platform Admin (PermissionGuard)
- [ ] Pagination works — changing page updates the URL and refetches
- [ ] Row click navigates to company detail
- [ ] Empty state rendered when no companies exist (Platform Admin only)
- [ ] Sidebar Companies link navigates to the correct page per role
- [ ] **Mobile:** card list renders with `displayName`, `companyKey` slug, `StatusBadge`, timezone, created date
- [ ] **Mobile:** `rowActions` (Edit, Delete) always visible in card footer, role-guarded
- [ ] **Mobile:** tap on card body navigates to company detail
- [ ] **Mobile:** filter inputs stack vertically, full width
- [ ] **Mobile:** pagination (`TablePagination`) appears below cards and works correctly
- [ ] **Mobile:** loading state shows 3 card-shaped skeletons
- [ ] **Mobile:** empty state and error state render correctly in card mode

---

### FB-001-e — Company Create Form

| Field | Value |
|---|---|
| **ID** | FB-001-e |
| **Priority** | P1 |
| **Effort** | S |
| **Status** | Not started |
| **Files** | `components/domain/company/CompanyForm.tsx`, `components/domain/company/index.ts` |

A `FormDrawer`-hosted RHF + Zod form for creating a new company.

**Fields:**
- Company Key (`companyKey`) — required, lowercase slug pattern, help text "Unique identifier e.g. `acme-corp`. Cannot be changed after creation."
- Display Name (`displayName`) — required
- Legal Name (`legalName`) — optional
- Tagline (`tagline`) — optional
- Timezone (`timezone`) — required, `ControlledSelect` with common IANA timezone options

**Behaviour:**
- Submit: `useCreateCompanyMutation`
- On success: close drawer, `pushSnack({ type: 'success', message: 'Company created' })`, navigate to `/companies/${data.companyKey}`
- On error: show `QueryError` inside the drawer (do not close)
- Submit button shows loading spinner while pending

**Props:**
```typescript
interface CompanyFormProps {
  open: boolean;
  onClose: () => void;
}
```

**Acceptance criteria:**
- [ ] Zod validation shows errors on invalid submit
- [ ] `companyKey` input is validated for slug pattern
- [ ] Successful create navigates to the new company detail
- [ ] Error response displayed inline in the drawer
- [ ] Form resets when drawer closes

---

### FB-001-f — Company Detail Page + Context Layout

| Field | Value |
|---|---|
| **ID** | FB-001-f |
| **Priority** | P1 |
| **Effort** | M |
| **Status** | Not started |
| **Files** | `app/(portal)/companies/[companyKey]/layout.tsx`, `app/(portal)/companies/[companyKey]/page.tsx` |

**Context layout** (`[companyKey]/layout.tsx`):
- Fetches `useCompany(companyKey)` and provides it via React Context to all child pages
- Shows `LoadingPage` while fetching
- Shows `QueryError` if fetch fails (company not found → back to list)
- Passes company data down via context (avoids re-fetching in each child)

**Detail page** (`[companyKey]/page.tsx`):
- `PageHeader` with company `displayName`, breadcrumbs `Companies > {displayName}`, action buttons: "Edit Company", "Delete"
- Company info card: Display Name, Legal Name, Tagline, Key, Timezone, Status, Created At
- Delete: uses `ConfirmDialog` with danger variant; on confirm: `useDeleteCompanyMutation` → navigate back to `/companies`

**Role behavior on this page:**

```tsx
const { canEditCompany, canDeleteCompany, canDeactivateCompany } = usePermissions();

// PageHeader actions are role-aware:
<PermissionGuard allowed={canEditCompany}>
  <Button onClick={openEditDrawer}>Edit Company</Button>
</PermissionGuard>

<PermissionGuard allowed={canDeactivateCompany}>
  <Chip
    label={company.isActive ? 'Active' : 'Inactive'}
    onClick={toggleActive}
    color={company.isActive ? 'success' : 'default'}
    clickable
  />
</PermissionGuard>

<PermissionGuard allowed={canDeleteCompany}>
  <Button color="error" onClick={openDeleteConfirm}>Delete</Button>
</PermissionGuard>
```

- Platform Admin sees all actions, all fields, "Delete" and deactivate toggle.
- Company Admin sees "Edit Company" only. No deactivate, no delete.
- Company User and Viewer see no action buttons. Read-only info card only.

Fields shown by role:
- All roles: Display Name, Key, Timezone, Status
- Platform Admin + Company Admin: Legal Name, Tagline, Created At
- Company User + Viewer: Display Name, Timezone, Status only (minimal view)

**Acceptance criteria:**
- [ ] Layout fetches company by key and propagates via context
- [ ] Loading and error states handled in layout
- [ ] "Edit Company" button rendered only for `canEditCompany` roles
- [ ] "Delete" button rendered only for `canDeleteCompany` roles (Platform Admin)
- [ ] Deactivate toggle rendered only for `canDeactivateCompany` roles (Platform Admin)
- [ ] Company User and Viewer see no action buttons
- [ ] Breadcrumbs correct
- [ ] "Delete" opens `ConfirmDialog`; on confirm deletes and navigates to `/companies`

---

### FB-001-g — Company Edit Form

| Field | Value |
|---|---|
| **ID** | FB-001-g |
| **Priority** | P1 |
| **Effort** | S |
| **Status** | Not started |
| **Files** | Update `components/domain/company/CompanyForm.tsx` to support edit mode |

**Edit form** reuses `CompanyForm` with an `initialValues` prop. `companyKey` field is **read-only** in edit mode for all roles.

**Props:**
```typescript
interface CompanyFormProps {
  open: boolean;
  onClose: () => void;
  mode?: 'create' | 'edit';
  companyKey?: string;
  initialValues?: Partial<CreateCompanyDto & { isActive: boolean }>;
}
```

**Role behavior in edit form:**

| Field | Platform Admin | Company Admin |
|---|---|---|
| `companyKey` | Read-only | Read-only |
| `displayName` | ✅ | ✅ |
| `legalName` | ✅ | ✅ |
| `tagline` | ✅ | ✅ |
| `timezone` | ✅ | ✅ |
| `isActive` toggle | ✅ (`canDeactivateCompany`) | ❌ hidden |

The `isActive` toggle is gated with `PermissionGuard`:
```tsx
<PermissionGuard allowed={canDeactivateCompany}>
  <ControlledSwitch name="isActive" control={control} label="Active" />
</PermissionGuard>
```

One component handles both roles — no duplicate form.

**Acceptance criteria:**
- [ ] Form pre-fills with current company data
- [ ] `companyKey` field is always disabled and non-editable in edit mode
- [ ] `isActive` toggle visible only when `canDeactivateCompany` (Platform Admin)
- [ ] Company Admin can submit without `isActive` — Zod schema makes it optional
- [ ] On success: close drawer, `pushSnack({ type: 'success', message: 'Company updated' })`, invalidate query
- [ ] Error shown inline on failure

---

## Sprint Dependencies

```
FB-001-0 (RBAC foundation)
  ↓ (enables PermissionGuard in all components below)
  ├── FB-001-a (DataTable)
  │     ↓
  │   FB-001-d (List page — role-aware redirect + guarded actions)
  │
  ├── FB-001-b (Form infrastructure)
  │     ↓
  │   FB-001-e (Create form — guarded by canCreateCompany)
  │   FB-001-g (Edit form — role-aware field set)
  │
  └── FB-001-c (API layer)
        ↓
      FB-001-d, FB-001-e, FB-001-f, FB-001-g

FB-001-d + FB-001-e + FB-001-f + FB-001-g
  → FB-001 COMPLETE
```

FB-001-0 must be completed first. FB-001-a, FB-001-b, and FB-001-c are then independent and can be built in parallel. Items FB-001-d through FB-001-g depend on all four (0, a, b, c).

---

## Definition of Done — Sprint-003

- [ ] All 8 sprint items (FB-001-0 through FB-001-g) completed
- [ ] `usePermissions()` returns correct flags for all four roles (verified manually or via unit test)
- [ ] `PermissionGuard` hides actions correctly in browser for each role
- [ ] Platform Admin sees all companies in paginated list
- [ ] Company Admin / User / Viewer are auto-redirected to own company detail
- [ ] "New Company" button absent for non-Platform-Admin roles
- [ ] "Edit" button absent for Company User and Viewer
- [ ] "Delete" button absent for all roles except Platform Admin
- [ ] Company Admin edit form hides `isActive` toggle
- [ ] Create, edit, and delete flows verified in browser against running backend
- [ ] `DataTable` pagination verified — page/pageSize changes refetch on desktop
- [ ] `DataTable` mobile card list verified in browser at < 600px viewport
- [ ] Mobile card actions (Edit, Delete) work and trigger correct drawer/dialog
- [ ] Mobile `TablePagination` changes page correctly
- [ ] `FormDrawer` is full-width at < 600px, 480px on desktop
- [ ] No TypeScript errors (`npm run type-check`)
- [ ] Production build passes (`npm run build`)
- [ ] Companies Sidebar link navigates correctly for each role
- [ ] Technical debt items TD-FE-001 through TD-FE-004 logged in `Technical Debt/Open/`
- [ ] `Architecture.md` folder structure updated to reflect new `lib/schemas/` directory
- [ ] `Components.md` updated with `DataTable`, `FormDrawer`, controlled input props
- [ ] `Backlog.md` FB-001 status updated to Completed
- [ ] `Current Sprint.md` updated
- [ ] This sprint document updated with completion dates

---

## Backlog Items NOT in this Sprint

The following are explicitly deferred to Sprint-004 and later:

- FB-002 Company Themes — depends on FB-001 complete
- FB-003 Channels — read-only list, can start independently but deferred to keep Sprint-003 focused
- FB-004 Providers — same as FB-003
- Logo upload (company logo via S3) — deferred until after core Companies CRUD is stable

---

## Related Documents

- [[../Backlog]]
- [[../Current Sprint]]
- [[../Audits/Audit-2026-06-14]]
- [[Sprint-002]]
- [[../../../../Project/Governance/Agents/communication-frontend-agent]]
- [[../../../../Modules/Communication/Backend/API.md]]
