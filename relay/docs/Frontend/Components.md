---
tags: [module, communication, frontend, components]
created: 2026-06-14
finalized: 2026-06-14
status: Finalized
agent: communication-frontend-agent
---

# Communication Frontend — Components

> **Status: Finalized.** This document is the component contract reference for all implementation work. Prop signatures and design behavior are binding. Visual specifications are in [[Design-System]]. Interaction flows are in [[UX]].

---

## Component Taxonomy

Four layers, consumed top-to-bottom:

```
Page Components          (app/ directory)
  └── Domain Components   (components/domain/)
        └── Shared Components (components/shared/)
              └── Layout Components (components/layout/)
```

**Rules:**
1. Pages import Domain components. Domain components import Shared components. Shared components import Layout components. No upward imports.
2. Every component is typed — `any` in props is forbidden.
3. Domain components use TanStack Query hooks — they never call `axios` directly.
4. Forms use React Hook Form + Zod — no `useState` for form field values.
5. Destructive actions always use `ConfirmDialog` — no `window.confirm`.
6. Every async action exposes explicit loading state.
7. All components are `'use client'` unless they contain no interactivity.

---

## Layout Components (`components/layout/`)

### `AppShell`

Root portal layout. Wraps sidebar + topbar + content area.

```typescript
interface AppShellProps {
  children: React.ReactNode;
}
```

Renders: `<Sidebar>` (persistent on desktop, drawer on mobile), `<Topbar>`, `<Box component="main">` with content padding.

---

### `Sidebar`

Navigation rail. 260px expanded, 64px icon-only, full-width mobile drawer.

```typescript
interface SidebarProps {
  open: boolean;                // drawer open state (mobile)
  onClose: () => void;         // close mobile drawer
}
```

Renders `<SidebarSection>` groups and `<SidebarItem>` per nav entry. Active item derived from `usePathname()`.

---

### `SidebarSection`

Labelled group of sidebar nav items.

```typescript
interface SidebarSectionProps {
  label?: string;               // section header label (e.g. "Configuration")
  children: React.ReactNode;
}
```

---

### `SidebarItem`

Single navigation item.

```typescript
interface SidebarItemProps {
  href: string;
  icon: React.ElementType;     // MUI icon component (e.g. BusinessOutlined)
  label: string;
  active?: boolean;            // override automatic active detection
  badge?: number;              // notification count badge
}
```

Active state: left border (`3px solid primary.main`), `background: primary.50`, `color: primary.main`.

---

### `Topbar`

Top navigation bar. 64px height.

```typescript
interface TopbarProps {
  onMenuToggle: () => void;    // toggles sidebar on mobile
  user: { name: string; email: string; avatarUrl?: string } | null;
}
```

Right side: Avatar + name + dropdown (Profile link, Sign out button).

---

### `PageHeader`

Consistent page title, breadcrumbs, and action button area.

```typescript
interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface PageHeaderProps {
  title: string;
  count?: number;              // shown as "Title (count)" in title
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;  // right-side action buttons/chips
  subtitle?: string;          // secondary description line
}
```

---

## Shared Components (`components/shared/`)

### `DataTable<T>`

> Updated 2026-06-14 with responsive props. See [[Design-System]] section 9 and 9a for visual specification, and [[UX]] Responsive CRUD Patterns for behavior rules.

Generic server-side paginated data component. Renders as a MUI X DataGrid on desktop/tablet (≥ sm, 600px) and as a card list on mobile (< sm). Breakpoint switch is internal — the parent passes the same props on all screen sizes.

#### Supporting Types

```typescript
// Field definition for a mobile card body row
interface MobileCardField<T> {
  field: keyof T;
  label?: string;
  render?: (value: unknown, row: T) => React.ReactNode;
}

// Full mobile card configuration — required for card view to activate
interface MobileCardConfig<T> {
  primaryText: keyof T | ((row: T) => string);     // main card title
  secondaryText?: keyof T | ((row: T) => string);  // subtitle below title
  badge?: (row: T) => React.ReactNode;             // right of title row (e.g. StatusBadge)
  fields: MobileCardField<T>[];                    // 2–4 body rows (label + value)
}
```

#### Props

```typescript
interface DataTableProps<T> {
  // ── Desktop table (DataGrid) ──────────────────────────────────────────
  columns: GridColDef<T>[];         // column definitions for desktop DataGrid
  getRowId?: (row: T) => string;    // default: (row) => (row as any).id
  checkboxSelection?: boolean;

  // ── Data ──────────────────────────────────────────────────────────────
  rows: T[];
  total: number;                    // total record count (server-side)

  // ── Pagination ────────────────────────────────────────────────────────
  page: number;                     // 0-indexed current page
  pageSize: number;                 // rows per page (25 | 50 | 100)
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;

  // ── Row interaction ───────────────────────────────────────────────────
  onRowClick?: (row: T) => void;    // tap card body or click row → navigate
  rowActions?: (row: T) => React.ReactNode; // icon buttons: rendered on row hover
                                            // (desktop) and in card footer (mobile)

  // ── States ────────────────────────────────────────────────────────────
  loading?: boolean;                // shows skeleton rows (desktop) or card skeletons (mobile)
  error?: Error | null;             // renders <QueryError> when truthy
  emptyState?: React.ReactNode;     // custom empty state; defaults to <EmptyState> with noRowsLabel
  noRowsLabel?: string;             // fallback empty message if emptyState not provided

  // ── Above-grid slot ───────────────────────────────────────────────────
  filterSlot?: React.ReactNode;     // FilterBar or custom filter controls; renders above grid/cards

  // ── Mobile card rendering ─────────────────────────────────────────────
  mobileCardConfig?: MobileCardConfig<T>; // required for card view; if absent, DataGrid renders
                                          // at all breakpoints (use for non-responsive tables)
}
```

**Page size options:** `[25, 50, 100]`. Default: 50.

**Internal behavior:**
- Uses `useMediaQuery(theme.breakpoints.down('sm'))` to select presentation mode.
- On mobile: renders a `Stack` of `MobileCard` sub-components (internal, not exported).
- On mobile: pagination rendered as `TablePagination` below the card list.
- `rowActions` receives the row and returns icon buttons; these appear on row hover in DataGrid and always-visible in card footer.
- `loading` + mobile: renders 3 `Skeleton` elements at card height (~120px) instead of DataGrid skeletons.
- `error` + `emptyState` + `noRowsLabel` behave identically in both modes.

**Rule:** Every module that uses `DataTable` with a list of business records **must** provide `mobileCardConfig`. The `mobileCardConfig` is co-located with the page component, not inside `DataTable`.

---

### `StatusBadge`

Active/Inactive status chip.

```typescript
interface StatusBadgeProps {
  active: boolean;
  size?: 'small' | 'medium';
}
```

Renders: `<Chip label="Active" color="success">` or `<Chip label="Inactive" color="error">`.

---

### `DefaultBadge`

"Default" indicator chip.

```typescript
interface DefaultBadgeProps {
  isDefault: boolean;
}
```

Renders: `<Chip label="Default" color="secondary">` when `isDefault` is true, nothing otherwise.

---

### `ChannelBadge`

Channel type indicator.

```typescript
interface ChannelBadgeProps {
  channel: 'email' | 'sms' | 'storage';
}
```

Renders: icon + label chip. Email → `EmailOutlined`, SMS → `SmsOutlined`, Storage → `StorageOutlined`.

---

### `KeyValueList`

Two-column label/value detail display.

```typescript
interface KeyValueItem {
  label: string;
  value: React.ReactNode;      // string, number, component (e.g. StatusBadge)
  copyable?: boolean;          // shows copy-to-clipboard icon
}

interface KeyValueListProps {
  items: KeyValueItem[];
  columns?: 1 | 2;             // default: 2-column layout
}
```

---

### `ConfirmDialog`

Reusable confirmation modal.

```typescript
interface ConfirmDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;       // default: "Confirm"
  cancelLabel?: string;        // default: "Cancel"
  danger?: boolean;            // confirm button uses error.main color
  loading?: boolean;           // confirm button shows spinner
  onConfirm: () => void;
  onClose: () => void;
}
```

---

### `EmptyState`

Empty list/page placeholder.

```typescript
interface EmptyStateProps {
  icon: React.ElementType;     // MUI icon
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}
```

Rendered centered in a fixed-height container.

---

### `QueryError`

Data fetch failure display.

```typescript
interface QueryErrorProps {
  error: Error | unknown;
  onRetry?: () => void;
  message?: string;            // override default error message
}
```

Displays `Alert severity="error"` with optional retry button.

---

### `PermissionGuard`

> Added 2026-06-14. See [[Architecture]] Permission Architecture and [[UX]] Role-Based UX Patterns.

Conditionally renders children based on a boolean permission flag. When `allowed` is false and no `fallback` is provided, renders nothing (`null`). This is the **only** permitted way to conditionally render role-gated content.

```typescript
interface PermissionGuardProps {
  allowed: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}
```

Usage pattern:
```tsx
const { canCreateCompany, canDeleteCompany } = usePermissions();

// Renders button only when allowed; renders nothing when not allowed
<PermissionGuard allowed={canCreateCompany}>
  <Button onClick={openCreateDrawer}>New Company</Button>
</PermissionGuard>

// Renders info alert as fallback when not allowed
<PermissionGuard allowed={canDeleteCompany} fallback={
  <Alert severity="info">You do not have permission to delete companies.</Alert>
}>
  <Button color="error" onClick={openConfirm}>Delete</Button>
</PermissionGuard>
```

Rules:
- Never check `user.role` directly in JSX — always use `usePermissions()` flags
- Never hide content with CSS `display: none` — use `PermissionGuard` so it is absent from the DOM
- The `fallback` prop is optional; omit it when nothing should be shown for unauthorized users

---

### `FilterBar`

Filter controls above a DataGrid.

```typescript
interface FilterOption {
  label: string;
  value: string | boolean;
}

interface FilterBarProps {
  filters: {
    key: string;
    label: string;
    type: 'select' | 'toggle' | 'search';
    options?: FilterOption[];
  }[];
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onClear: () => void;
}
```

Active filters shown as dismissible chips below the filter inputs.

---

### `GlobalSnackbar`

Renders the global toast queue from `ui.store.ts`. No props — reads from Zustand.

Place once in `app/(portal)/layout.tsx`.

---

### `LoadingPage`

Full-page loading indicator for auth check / initial data hydration.

```typescript
// No props
```

Renders: centered `CircularProgress` on `background.default`.

---

### Form Components

All form components wrap MUI inputs with React Hook Form `Controller`.

#### `ControlledTextField`

```typescript
interface ControlledTextFieldProps extends Omit<TextFieldProps, 'name'> {
  control: Control<any>;
  name: string;
  label: string;
  required?: boolean;
  helperText?: string;
}
```

#### `ControlledSelect`

```typescript
interface SelectOption {
  value: string | number;
  label: string;
}

interface ControlledSelectProps {
  control: Control<any>;
  name: string;
  label: string;
  options: SelectOption[];
  required?: boolean;
  multiple?: boolean;
  loading?: boolean;           // shows loading indicator in select
}
```

#### `ControlledSwitch`

```typescript
interface ControlledSwitchProps {
  control: Control<any>;
  name: string;
  label: string;
}
```

#### `ControlledAutocomplete<T>`

```typescript
interface ControlledAutocompleteProps<T> {
  control: Control<any>;
  name: string;
  label: string;
  options: T[];
  getOptionLabel: (option: T) => string;
  loading?: boolean;
  required?: boolean;
}
```

Used for: company selector, event selector, channel selector.

#### `FormError`

```typescript
interface FormErrorProps {
  message: string | undefined;
}
```

Renders `<Alert severity="error">` only when `message` is defined.

---

### `FormDrawer`

Wrapper for right-side create/edit drawers.

```typescript
interface FormDrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  width?: number;              // default: 480
  children: React.ReactNode;  // form fields
  actions: React.ReactNode;   // footer buttons (Cancel + Save)
  dirty?: boolean;            // warn on close if dirty
}
```

Manages unsaved-changes confirmation if `dirty` is true.

---

## Domain Components (`components/domain/`)

### Company Components

#### `CompanyForm`

Handles both create and edit via a `mode` discriminant prop. Reuses a single component for both modes.

```typescript
// Create mode
interface CreateCompanyFormProps {
  mode: 'create';
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompanyFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
}

// Edit mode
interface EditCompanyFormProps {
  mode: 'edit';
  open: boolean;
  onClose: () => void;
  company: Company;
  onSubmit: (data: UpdateCompanyFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
}
```

Create fields: `companyKey` (slug, editable), `displayName`, `legalName`, `tagline`, `timezone`.
Edit fields: `companyKey` (read-only), `displayName`, `legalName`, `tagline`, `timezone`, `isActive` (only when `canDeactivateCompany`).

#### `CompanyViewDrawer`

Read-only detail drawer for viewing a company without navigating away from the list.

```typescript
interface CompanyViewDrawerProps {
  open: boolean;
  company: Company | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}
```

Renders all company fields as key-value rows. Edit and Delete buttons in footer, each wrapped in `PermissionGuard`.

#### `LogoUpload`

```typescript
interface LogoUploadProps {
  value?: { iconUrl?: string; fullUrl?: string };
  onChange: (files: { iconFile?: File; fullFile?: File }) => void;
}
```

Two dropzones. Accepted: PNG, JPG, SVG. Max: 5MB. Shows preview thumbnail after selection.

---

### Theme Components

#### `ThemeColorPicker`

```typescript
interface ThemeColorPickerProps {
  control: Control<any>;
  name: string;
  label: string;
}
```

Renders a `ControlledTextField` with a color swatch preview square. Native `<input type="color">` on click. Value stored as hex string.

#### `ThemePreview`

```typescript
interface ThemePreviewProps {
  theme: CompanyTheme;
}
```

Shows a small card with the company's brand colors applied. Used in theme list and edit.

---

### Channel & Provider Components

#### `CredentialForm`

Dynamic form that renders different fields based on `connectionType`.

```typescript
interface CredentialFormProps {
  connectionType: 'api_key' | 'smtp' | 'oauth' | 'access_keys';
  providerKey: string;         // e.g. 'sendgrid', 'mailgun', 'twilio'
  control: Control<any>;
}
```

Field groups by `connectionType` + `providerKey` combination — see [[UX]] credential management section.

#### `CredentialVerifyResult`

```typescript
interface CredentialVerifyResultProps {
  result: { ok: boolean; message: string } | null;
  loading?: boolean;
}
```

Inline feedback showing verification pass/fail from the backend `verifyCredentials()` response.

---

### Domain & Event Components

#### `ChannelRoutingForm`

```typescript
interface ChannelRoutingFormProps {
  companyId: string;
  channels: ('email' | 'sms')[];   // channels allowed by this domain
  control: Control<any>;
  name: string;                    // field name in parent form
}
```

For each channel in `channels`, renders a `ControlledSelect` loading options from `GET /provider-credentials/options?companyId=&channel=`. Option label format: `EMAIL — Sendgrid — transactional`.

#### `EventChannelContentForm`

```typescript
interface EventChannelContentFormProps {
  channels: ('email' | 'sms')[];
  control: Control<any>;
}
```

For each channel, renders content fields:
- Email: subject template, body template, requiredVariables, optionalVariables
- SMS: text template, requiredVariables, optionalVariables

---

### Template Components

#### `CodeEditor`

CodeMirror v6 wrapper for HTML/CSS editing.

```typescript
interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'html' | 'css';
  height?: string;             // default: '300px'
  readOnly?: boolean;
}
```

Must be `'use client'`. Uses `@uiw/react-codemirror` with `@codemirror/lang-html` or `@codemirror/lang-css`. Theme: `githubLight` (matches the app's light mode).

#### `TemplatePreviewPanel`

```typescript
interface TemplatePreviewPanelProps {
  templateId: string;
  variables: Record<string, string>;    // current variable values
  refreshTrigger?: number;              // increment to force refresh
}
```

Calls `GET /preview/layout` with template HTML + variables. Displays rendered HTML in a sandboxed container. Uses `srcdoc` on an `<iframe sandbox="allow-same-origin">` for isolation.

#### `VariableList`

```typescript
interface VariableListProps {
  name: string;               // 'requiredVariables' or 'optionalVariables'
  control: Control<any>;
  required?: boolean;
}
```

Editable list of string variable names. Add/remove buttons. Used in template editor.

---

### Notification Components

#### `NotificationTestForm`

```typescript
interface NotificationTestFormProps {
  onResult: (result: NotificationTestResult) => void;
}

interface NotificationTestResult {
  status: 200 | 207 | number;
  eventKey: string;
  companyId: string;
  results: NotificationResultDto[];
}
```

Manages the full test flow: company select → event select → variable fill → submit.

#### `NotificationResultPanel`

```typescript
interface NotificationResultPanelProps {
  result: NotificationTestResult | null;
}
```

Renders per-channel result rows. Success rows: green icon. Failure rows: red icon + expandable error detail.

#### `DeliveryStatusAlert`

```typescript
interface DeliveryStatusAlertProps {
  httpStatus: number;          // 200 or 207
  totalChannels: number;
  failedChannels: number;
}
```

Renders the appropriate `Alert` based on HTTP status. `200` → success, `207` → warning with counts.

---

### File Components

#### `FileUploadZone`

```typescript
interface FileUploadZoneProps {
  accept: Record<string, string[]>;    // MIME types
  maxSizeMB: number;
  onSelect: (file: File) => void;
  uploadProgress?: number;             // 0–100
  uploading?: boolean;
  error?: string;
  label?: string;
}
```

Uses `react-dropzone`. Shows: idle → "Drop file here or click to browse" / uploading → progress bar / error → error text.

#### `DownloadButton`

```typescript
interface DownloadButtonProps {
  companyId: string;
  storageKey: string;
  fileName?: string;
  label?: string;              // default: "Download"
  variant?: 'text' | 'outlined' | 'contained';
}
```

Calls `GET /files/storage/download?companyId=&key=` → receives presigned URL → triggers browser download.

---

## Component Usage Rules Summary

| Rule | Rationale |
|---|---|
| No `any` in props | Type safety enables safe refactoring and editor autocomplete |
| No `axios` in components | API calls belong in TanStack Query hooks; components only consume data |
| No `useState` for form fields | React Hook Form owns form state; `useState` is for UI-only state |
| No `window.confirm` | `ConfirmDialog` is accessible and themeable; `window.confirm` is not |
| Explicit loading state on every async action | Hidden loading states cause duplicate submissions and confused users |
| `'use client'` only where required | Reduces client bundle; allows Next.js optimizations |

---

## Related Documents

- [[Architecture]]
- [[Design-System]]
- [[UX]]
- [[State-Management]]
- [[Decisions/DEC-002 Frontend Stack]]
