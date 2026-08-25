---
tags: [module, communication, frontend, design-system]
created: 2026-06-14
finalized: 2026-06-14
updated: 2026-06-14
status: Finalized (responsive CRUD addendum added)
agent: communication-frontend-agent
---

# Communication Frontend — Design System

> **Status: Finalized.** This document defines all visual design decisions. The implementation target is `theme/mui-theme.ts` and the shared component library in `components/`.
>
> **Responsive CRUD addendum (2026-06-14):** Section 9 updated with mobile card view. Section 19 updated with mobile list design. Section 9a (Mobile Card) added.

## Design Direction

**Clean enterprise SaaS dashboard.** Minimal. Professional. Functional above decorative.

Design references and what we borrow from each:
- **Linear** — spacing generosity, sidebar restraint, active state clarity, typographic weight
- **Stripe** — form precision, professional tone, muted color vocabulary, clear CTA hierarchy
- **Vercel** — minimal chrome, high contrast text, breathing room in layouts
- **Notion** — simple navigation hierarchy, content-first, non-intimidating for non-technical users

**What this is not:** a marketing site, a consumer app, or a heavily branded dashboard. Administrators will spend hours in this tool. Every decision should serve clarity and speed, not visual novelty.

---

## 1. Color Palette

### Brand Palette

| Token | Hex | Usage |
|---|---|---|
| `primary.main` | `#4263EB` | Primary buttons, active nav, focus rings, links |
| `primary.dark` | `#3451D1` | Pressed state on primary buttons |
| `primary.light` | `#6785F5` | Hover tint, non-destructive highlights |
| `primary.50` | `#EEF2FF` | Active nav item background, chip background |
| `primary.contrastText` | `#FFFFFF` | Text on primary-colored backgrounds |

**Rationale:** An indigo-blue in the Linear/Intercom family. Professional without being the generic MUI `#1976D2`. High enough contrast on white backgrounds (WCAG AA at all sizes).

### Semantic Palette

| Token | Hex | MUI alias | Usage |
|---|---|---|---|
| `success.main` | `#0EA66F` | `success` | Active badge, success toast, delivered notification |
| `success.light` | `#D1FAE5` | — | Success alert background |
| `error.main` | `#DC2626` | `error` | Inactive badge, error toast, destructive button, failed notification |
| `error.light` | `#FEE2E2` | — | Error alert background |
| `warning.main` | `#D97706` | `warning` | Warning toast, partial delivery badge |
| `warning.light` | `#FEF3C7` | — | Warning alert background |
| `info.main` | `#2563EB` | `info` | Info toast, info alert |
| `info.light` | `#DBEAFE` | — | Info alert background |
| `secondary.main` | `#7C3AED` | `secondary` | "Default" badge, secondary accents |

### Neutral Palette

| Token | Hex | Usage |
|---|---|---|
| `background.default` | `#F8FAFC` | Page background (entire app) |
| `background.paper` | `#FFFFFF` | Cards, sidebar, topbar, dialog surfaces |
| `text.primary` | `#0F172A` | All body text, headings, labels |
| `text.secondary` | `#64748B` | Metadata, captions, placeholder text, helper text |
| `text.disabled` | `#94A3B8` | Disabled field text |
| `divider` | `#E2E8F0` | Table row dividers, card borders, section separators |
| `action.hover` | `rgba(66, 99, 235, 0.04)` | Subtle row hover, nav item hover |
| `action.selected` | `rgba(66, 99, 235, 0.08)` | Selected row, active state |

---

## 2. Typography

**Font family:** `Inter` — loaded via `next/font/google`. Fallback: `system-ui, -apple-system, sans-serif`.

Inter is the shared language of Linear, Stripe, Vercel, Notion, and most modern SaaS tools. It is designed for screen readability, neutral at all weights, and has excellent coverage of numerals and punctuation needed for data-heavy UIs.

### Scale

| MUI Variant | Font Size | Font Weight | Line Height | Usage |
|---|---|---|---|---|
| `h4` | 1.5rem (24px) | 600 | 1.3 | Page titles, main headings |
| `h5` | 1.25rem (20px) | 600 | 1.4 | Section headings, card titles |
| `h6` | 1.125rem (18px) | 600 | 1.4 | Sub-section headings, dialog titles |
| `subtitle1` | 1rem (16px) | 500 | 1.5 | Emphasis in body text, table headers |
| `subtitle2` | 0.875rem (14px) | 500 | 1.5 | Secondary emphasis, sidebar section labels |
| `body1` | 0.9375rem (15px) | 400 | 1.6 | Default body text, form labels, detail values |
| `body2` | 0.875rem (14px) | 400 | 1.6 | Secondary body text, metadata |
| `caption` | 0.75rem (12px) | 400 | 1.5 | Timestamps, helper text, badges |
| `button` | 0.875rem (14px) | 500 | — | Button labels (`text-transform: none`) |
| `overline` | 0.75rem (12px) | 600 | — | Section category labels (uppercase) |

**Rules:**
- `text-transform: none` on all buttons and chips — no ALL CAPS
- Numeric data: `font-variant-numeric: tabular-nums` on all data tables for column alignment
- No text smaller than 12px (`caption`) in any interactive element

---

## 3. Spacing System

Base unit: `8px` (MUI default — do not override).

| Multiplier | Value | Usage |
|---|---|---|
| `spacing(0.5)` | 4px | Tight icon padding, badge internal spacing |
| `spacing(1)` | 8px | Between inline elements, icon-to-text gap |
| `spacing(1.5)` | 12px | Small component internal padding |
| `spacing(2)` | 16px | Component internal padding, form field vertical margin |
| `spacing(3)` | 24px | Between cards, section gap, form field spacing |
| `spacing(4)` | 32px | Section vertical padding |
| `spacing(5)` | 40px | Page section gap |
| `spacing(6)` | 48px | Large section separation |

**Page-level spacing:**
- Content area horizontal padding: `spacing(3)` = 24px (all sides on desktop)
- Content max-width: `1400px` centered
- Section vertical gap: `spacing(4)` = 32px between major sections

---

## 4. Layout System

### Structure

```
┌─────────────────────────────────────────────────┐
│                 Topbar (64px)                    │
├──────────────┬──────────────────────────────────┤
│              │                                  │
│   Sidebar    │         Content Area             │
│   (260px)    │         max-width: 1400px        │
│              │         padding: 24px            │
│              │                                  │
└──────────────┴──────────────────────────────────┘
```

### Sidebar

| State | Width | Behavior |
|---|---|---|
| Expanded | 260px | Full labels + icons |
| Collapsed (icon-only) | 64px | Icons only, tooltips on hover |
| Mobile drawer | 260px | Overlays content, closes on navigation |

- Background: `background.paper` (`#FFFFFF`)
- Border-right: `1px solid #E2E8F0`
- No box-shadow (clean, flat)
- Collapses at `md` breakpoint (900px)
- Becomes full-width drawer below `sm` (600px)

**Nav item anatomy:**
```
[icon]  [label]                   ← normal
[icon]  [label]  ●                ← active (dot or left border)
[icon]  [label]                   ← hover (background tint)
```

- Item height: 40px
- Border-radius: 6px
- Horizontal padding: `spacing(1.5)` (12px)
- Icon size: 20px, `text.secondary` color (normal), `primary.main` (active)
- Active item: `background: #EEF2FF`, `color: primary.main`, `font-weight: 500`
- Hover item: `background: rgba(0,0,0,0.04)` (subtle)
- Section dividers: `1px solid #E2E8F0` with `overline` category label above

### Topbar

- Height: 64px
- Background: `background.paper`
- Border-bottom: `1px solid #E2E8F0`
- Left: hamburger (mobile) or logo/wordmark, breadcrumb trail
- Right: user avatar + display name + chevron → dropdown (Profile, Logout)
- No drop-shadow on topbar (flat hierarchy with sidebar)

### Content Area

- Background: `background.default` (`#F8FAFC`)
- Padding: `24px` on all sides (desktop)
- Reduced to `16px` below `sm`

---

## 5. Elevation & Shadows

Flat-first design. Shadows are used sparingly to establish hierarchy, not decoration.

| Context | Elevation | Shadow value |
|---|---|---|
| Cards (default) | 0 | None — outlined variant only |
| Interactive cards (hover) | 1 | `0 1px 3px rgba(0,0,0,0.08)` |
| Dropdown menus, popovers | 4 | `0 4px 12px rgba(0,0,0,0.10)` |
| Modals, dialogs | 8 | `0 8px 24px rgba(0,0,0,0.12)` |
| Drawers | 16 | `0 16px 40px rgba(0,0,0,0.14)` |

Cards use `variant="outlined"` by default — a `1px solid #E2E8F0` border, no shadow, `border-radius: 8px`. This is the Stripe/Linear card pattern.

---

## 6. Border Radius

| Context | Radius |
|---|---|
| Buttons | 6px |
| Cards | 8px |
| Inputs | 6px |
| Chips / badges | 100px (pill) |
| Dialogs | 12px |
| Tooltips | 6px |
| DataGrid | 8px (outer) |
| Avatars | 100% (circle) |
| Large content panels | 10px |

---

## 7. Button Styles

### Variants

| Variant | Background | Border | Text | Usage |
|---|---|---|---|---|
| **Primary** (contained) | `primary.main` | none | white | Primary CTA: Save, Create, Submit |
| **Secondary** (outlined) | transparent | `primary.main` | `primary.main` | Secondary action: Cancel, View, Export |
| **Ghost** (text) | transparent | none | `primary.main` | Tertiary action, inline links |
| **Destructive** | `error.main` | none | white | Delete, Remove, Deactivate (after confirm) |
| **Neutral** (outlined) | transparent | `#E2E8F0` | `text.primary` | Low-emphasis actions |

### Sizes

| Size | Height | Font size | Padding (H) |
|---|---|---|---|
| Small | 30px | 13px | 12px |
| Medium (default) | 36px | 14px | 16px |
| Large | 42px | 15px | 20px |

### States

- **Hover:** lighten background by 10% (contained) or add light tint (outlined)
- **Loading:** MUI `LoadingButton` with circular spinner (16px), button disabled and dims to 70%
- **Disabled:** 38% opacity, `cursor: not-allowed`
- **Focus:** 2px ring in `primary.main` at 2px offset (keyboard navigation)

### Global overrides (`mui-theme.ts`)

```
MuiButton:
  defaultProps:
    disableElevation: true
    disableRipple: false
  styleOverrides:
    root:
      textTransform: none
      borderRadius: 6
      fontWeight: 500
      lineHeight: 1
```

---

## 8. Card Styles

**Default card:** `variant="outlined"`, `border-radius: 8px`, `border: 1px solid #E2E8F0`, no shadow.

### Card anatomy

```
┌─────────────────────────────────────────┐ ← 1px #E2E8F0 border, 8px radius
│  Card Header (optional)                 │ ← padding: 16px 20px 12px
│  Title (h6) + subtitle (body2)          │
├─────────────────────────────────────────┤ ← 1px #E2E8F0 divider
│                                         │
│  Card Content                           │ ← padding: 20px
│                                         │
├─────────────────────────────────────────┤ ← 1px #E2E8F0 divider (if actions)
│  Card Actions (optional)                │ ← padding: 12px 16px, right-aligned
│  [Cancel]  [Save]                       │
└─────────────────────────────────────────┘
```

### Card variants

| Variant | Use case |
|---|---|
| **Default** | All content containers, stat cards, info panels |
| **Interactive** | Clickable cards (company cards, provider cards) — hover shadow `0 1px 3px rgba(0,0,0,0.08)` |
| **Selected** | Selected state → `border: 2px solid primary.main`, `background: primary.50` |
| **Colored header** | Stat dashboard cards — `background: primary.50` header area |

---

## 9. DataGrid (Table) Standards

All list pages use `MUI X DataGrid Community` in `paginationMode="server"` mode on desktop/tablet. On mobile (below `sm`, 600px) the DataTable component automatically switches to a card list. See section 9a for the mobile card design.

### Visual standards

| Property | Value |
|---|---|
| Outer border | None (`border: 'none'` in theme override) |
| Row height | 52px |
| Header height | 48px |
| Header background | `#F8FAFC` |
| Header font | `subtitle2` (14px, 500 weight) |
| Header text color | `text.secondary` |
| Row divider | `1px solid #E2E8F0` |
| Row hover | `background: rgba(66,99,235,0.04)` |
| Selected row | `background: rgba(66,99,235,0.08)` |
| Density | Standard (`density="standard"`) |

### Column conventions

| Column type | Alignment | Width | Notes |
|---|---|---|---|
| ID / key | Left | 160px | Monospace, `caption` size |
| Name / title | Left | flex: 1 | Primary column, `body1` |
| Status badge | Left | 120px | `StatusBadge` chip component |
| Date / time | Left | 160px | Formatted, `caption` color for relative time |
| Count | Right | 100px | `tabular-nums` |
| Actions | Right | **160px** (2–3 buttons) / **180px** (4+ buttons) | `RowActions` component — see §9b |

### 9b. Actions Column — canonical layout

Every CRUD table uses the shared `RowActions` component (`components/shared/RowActions.tsx`) for its action cell. Never implement custom spacing per-page.

```tsx
// Pattern — all CRUD tables
rowActions={(row) => (
  <PermissionGuard allowed={canManage}>
    <RowActions>
      <Tooltip title="Edit">
        <IconButton size="small">
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error">
          <DeleteOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </RowActions>
  </PermissionGuard>
)}
```

**`RowActions` enforces:**

| Property | Value | Rationale |
|---|---|---|
| Layout | `display: flex; align-items: center; justify-content: flex-end` | Right-aligns buttons in cell |
| Gap between buttons | `12px` (`spacing(1.5)`) | DS spacing unit — never 4px or 0px |
| Touch target per button | `36 × 36px` | Accessible click/tap area |
| Button border-radius | `6px` (matches DS button radius) | Replaces MUI's default circle |
| Hover background | `action.hover` via MUI theme | `rgba(66,99,235,0.04)` |

**Icon button colour conventions:**

| Action | `color` prop | Icon family |
|---|---|---|
| Test / verify | `primary` | `VerifiedOutlined`, `NetworkCheckOutlined` |
| View / preview | — (default) | `VisibilityOutlined` |
| Edit | — (default) | `EditOutlined` |
| Duplicate | — (default) | `ContentCopyOutlined` |
| Deactivate | `warning` | `BlockOutlined` |
| Reactivate | `success` | `CheckCircleOutlined` |
| Delete | `error` | `DeleteOutlined` / `DeleteOutlineOutlined` |

**Mobile:** `RowActions` renders identically in mobile card footers (`CardActions`). The 12px gap and 36px touch targets ensure icons never touch on any screen size.

**Custom DataGrid (non-`DataTable`):** pass `onClick={(e) => e.stopPropagation()}` to `RowActions` to prevent the row-click handler from firing when action buttons are clicked. The shared `DataTable` wrapper already handles this.

**`DataTable` integration:** the `__actions__` column is auto-appended at `width: 160` (or `180` for 4+ button tables). Pass `rowActions` prop — `DataTable` wraps it in a `stopPropagation` Box automatically.

### Pagination

```
Rows per page: [25 ▼]    1–50 of 243    [←]  [1]  [2]  [3]  [→]
```

- Default page size: 50
- Page size options: `[25, 50, 100]`
- DataGrid handles display; TanStack Query provides data per `(limit, offset)` pair

> **MUI DataGrid Community limit:** MUI DataGrid Community (MIT licence) enforces a hard maximum of **100 rows per page**. Never configure a frontend table with `pageSize` above 100. The shared `DataTable` component enforces this by clamping any incoming `pageSize` prop to `Math.min(pageSize, 100)`. Passing a larger value is a silent no-op — not an override.

---

## 9a. Mobile Card View (< sm, below 600px)

> Added 2026-06-14. When `DataTable` receives a `mobileCardConfig` prop and the viewport is below the `sm` breakpoint, it renders a card list instead of the DataGrid.

### Breakpoint Switch

| Breakpoint | Presentation |
|---|---|
| `>= sm` (≥ 600px) | MUI X DataGrid — full table with columns, hover actions, pagination |
| `< sm` (< 600px) | Card list — full-width stacked cards with field rows and tap actions |

The switch is implemented inside `DataTable` using `useMediaQuery(theme.breakpoints.down('sm'))`. There is no separate mobile component — one component, one prop set, two presentations.

### Mobile Card Anatomy

```
┌─────────────────────────────────────────────┐  ← Card: 1px #E2E8F0 border, 8px radius
│  Acme Corp                    ● Active       │  ← primaryText (body1, 500) + badge (right)
│  acme-corp                                  │  ← secondaryText (body2, text.secondary)
├─────────────────────────────────────────────┤  ← 1px divider
│  Timezone    Australia/Sydney               │  ← field rows: label (caption, text.secondary)
│  Created     Jun 14, 2026                  │      + value (body2, text.primary)
├─────────────────────────────────────────────┤  ← 1px divider (only if rowActions present)
│  [✏ Edit]                  [🗑 Delete]      │  ← card actions: icon buttons, right-aligned
└─────────────────────────────────────────────┘
```

**Card specifications:**
- Width: 100% of content area
- Margin between cards: `spacing(1.5)` = 12px
- Padding: `spacing(2)` = 16px
- Background: `background.paper`
- Border: `1px solid #E2E8F0`, `border-radius: 8px`
- Tap on card body (above the action row): triggers `onRowClick`
- Card actions row: same icon buttons as desktop row hover actions

**Header row:**
- `primaryText` left-aligned: `body1`, `fontWeight: 500`, `text.primary`
- `badge` right-aligned: e.g. `StatusBadge` chip
- `secondaryText` below primary: `body2`, `text.secondary`

**Field rows:**
- Each `MobileCardField` renders as a two-column row: `label` (left, 35%, `caption`, `text.secondary`) + `value` (right, 65%, `body2`, `text.primary`)
- Maximum recommended: 3–4 fields (card becomes too tall beyond that)
- Custom `render` function used for dates, chips, or compound values

**Action row:**
- Rendered at card bottom, separated by divider
- Icon buttons: same as desktop (`EditOutlined`, `DeleteOutlineOutlined`)
- Delete still triggers `ConfirmDialog` — same behavior as desktop

### Mobile Pagination

MUI `TablePagination` component is placed below the card list on mobile. Same props as desktop:
- "Rows per page" select: `[25, 50, 100]`
- Previous/Next arrows
- Count text: `1–50 of 243`

No change to pagination logic — the parent passes the same `page`, `pageSize`, `onPageChange`, `onPageSizeChange` props.

### Mobile Filters

The `filterSlot` (if provided) renders above the card list, same as on desktop. On mobile:
- Filter fields stack vertically in `Stack direction="column"`
- Search input is full width
- Clear filters chip row wraps horizontally
- Same React node — no separate mobile filter

### Mobile Empty / Loading / Error States

`EmptyState`, `Skeleton` loading rows, and `QueryError` work identically in both modes:
- Loading: card-shaped skeletons rendered at the expected card height (approximately 120px)
- Empty: same `EmptyState` component centered in the card list area
- Error: same `QueryError` component

---

## 10. Form Standards

### Field layout

All forms use vertical stacking. Label always visible above field (floating labels are the MUI default — we keep them for input fields, but section labels use `FormLabel` above).

```
┌──────────────────────────────────┐
│ Company Name *                    │ ← label (body2, text.primary)
│ ┌────────────────────────────┐   │
│ │ Acme Corp                  │   │ ← outlined TextField
│ └────────────────────────────┘   │
│ Must be unique across all        │ ← helper text (caption, text.secondary)
│ companies.                       │
└──────────────────────────────────┘

Error state:
│ ┌────────────────────────────┐   │
│ │                            │   │ ← red border
│ └────────────────────────────┘   │
│ This field is required.          │ ← helperText (caption, error.main)
```

### Field spacing

- Between fields: `spacing(3)` = 24px (vertical `Stack` gap)
- Within a group of related fields: `spacing(2)` = 16px
- Section gap between field groups: `spacing(4)` = 32px

### Validation

- Validation fires on `blur` for each field
- Full form validation fires on submit
- Required marker: `*` appended to label via `required` prop on `TextField`
- Error text via `helperText` prop, `error={true}` on `TextField`
- Form-level errors: `Alert severity="error"` rendered above the submit button

### Input defaults

```
size="medium"
variant="outlined"
fullWidth={true}
```

### Select fields

Use MUI `Select` wrapped in `FormControl + InputLabel + Select`. Options are plain strings or `{ value, label }` objects.

### Boolean fields

- Single toggle: `Switch` with `FormControlLabel`
- Multi-option: `Checkbox` group, or `ToggleButtonGroup` for exclusive options
- Never use `Checkbox` for single binary choice (use `Switch`)

### Form action buttons

```
                         [Cancel]  [Save]
```

- Right-aligned in all forms
- Cancel: outlined neutral button → navigates back (no confirm needed if form is pristine)
- Save: primary contained LoadingButton
- Stack above each other on mobile

---

## 11. Drawer & Modal Standards

### Drawer (right-side panel)

Used for: Create forms, Edit forms on detail pages.

| Property | Value |
|---|---|
| Anchor | right |
| Width | 480px (desktop), 100vw (mobile) |
| Background | `background.paper` |
| Header | 64px — title (h6) + close button |
| Content | Scrollable, `padding: 24px` |
| Footer | 64px — action buttons |
| Backdrop | `rgba(0,0,0,0.4)` |

```
┌─────────────────────────┐
│ Create Company     [✕]  │ ← Drawer header
├─────────────────────────┤
│                         │
│   [form fields]         │ ← Scrollable content
│                         │
├─────────────────────────┤
│ [Cancel]     [Create]   │ ← Drawer footer
└─────────────────────────┘
```

### Dialog (modal)

Used for: Confirmations, small informational prompts, previews.

| Size | maxWidth | Use case |
|---|---|---|
| `xs` | 400px | Simple confirmation ("Are you sure?") |
| `sm` | 600px | Confirmation with details, small forms |
| `md` | 900px | Medium preview, complex confirmation |
| `lg` | 1200px | Template preview, full-width content |

All dialogs: `fullWidth={true}`, `border-radius: 12px`.

**Confirmation dialog pattern:**
```
┌─────────────────────────────────────┐
│ Delete Company                 [✕]  │ ← Dialog title
├─────────────────────────────────────┤
│ Are you sure you want to delete     │
│ "Acme Corp"? This action cannot     │
│ be undone.                          │
├─────────────────────────────────────┤
│ [Cancel]            [Delete]        │ ← Right: destructive button
└─────────────────────────────────────┘
```

---

## 12. Toast & Alert Standards

### Snackbar (global toasts)

Rendered by `GlobalSnackbar` component, driven by `ui.store.snackQueue`.

| Type | Icon | Color | Duration | Auto-dismiss |
|---|---|---|---|---|
| `success` | CheckCircleOutlined | `success.main` | 3 000 ms | Yes |
| `error` (4xx) | ErrorOutlined | `error.main` | 6 000 ms | Yes |
| `error` (5xx / network) | ErrorOutlined | `error.main` | 8 000 ms | Yes |
| `warning` | WarningAmberOutlined | `warning.main` | 5 000 ms | Yes |
| `info` | InfoOutlined | `info.main` | 4 000 ms | Yes |

> **Policy (2026-06-27):** Every notification must eventually auto-dismiss. No toast may remain permanently visible. Error duration is determined by `mapApiErrorDuration()` — see [Form-Behaviour.md §5.4](../Frontend/Standards/Form-Behaviour.md). All snackbars include a manual close button.

Position: bottom-right. Max 3 simultaneous (oldest dismissed when 4th arrives).

### Inline Alert (page-level)

`Alert` component placed inside page content:
- `severity="error"` for API failures and form errors
- `severity="success"` for completed async operations
- `severity="warning"` for deprecation notices or partial results (e.g. 207 response)
- `severity="info"` for context that helps the user

Alerts include a dismiss button (`X`) where appropriate.

---

## 13. Loading States

### Pattern matrix

| Context | Loading pattern |
|---|---|
| Initial page data load | MUI `Skeleton` — full-layout placeholder |
| DataGrid loading | Skeleton rows (match row height and column count) |
| Button action in progress | `LoadingButton` with circular progress, button disabled |
| Drawer/dialog submit | Button spinner, form fields disabled |
| Background refetch | No indicator (transparent to user) |
| Full-page auth check | `LoadingPage` component: centered spinner |

### Skeleton conventions

- Color: MUI default (`#E0E0E0` base)
- Animation: `wave` (not `pulse`)
- Match the expected element dimensions exactly
- Never show skeleton and real content simultaneously

---

## 14. Empty States

Every list view must define its empty state explicitly.

**Pattern:**
```
          [Icon — 48px, text.secondary]
          Title (h6, text.primary)
          Description (body2, text.secondary, max 2 lines)
          [Primary action button]
```

Centered horizontally in the content area, vertically centered in the DataGrid space.

**Examples:**

| Page | Icon | Title | Description | Action |
|---|---|---|---|---|
| Companies | `BusinessOutlined` | No companies yet | Add your first company to start sending notifications. | Create Company |
| Events | `NotificationsOutlined` | No events in this domain | Create events to define what triggers notifications. | Create Event |
| Credentials | `KeyOutlined` | No credentials configured | Add provider credentials to start delivering messages. | Add Credentials |
| Notifications test | `SendOutlined` | No results yet | Select a company and event to test delivery. | — |

---

## 15. Error States

### Field-level

`helperText` on `TextField` with `error={true}`. Red text, 12px, below the field.

### Form-level

`Alert severity="error"` rendered above the submit button:
```
⚠ Something went wrong. Please check the form and try again.
```

Shown when the API returns a non-validation error (e.g. 500 or unexpected 400).

### Page-level (data fetch failed)

`QueryError` shared component:
```
          ⚠
     Failed to load companies
  There was a problem fetching data.
       [Retry]  [Go back]
```

Centered in the content area. Always includes a retry button. Shows the error message from the API if available and safe to display.

### Network error

Snackbar: `error` severity, "Cannot connect to the server. Check your network connection."

---

## 16. Success States

### After form submit (create or update)

Snackbar: `success` severity, auto-dismiss 4s.

Examples:
- "Company created" / "Company updated"
- "Credentials saved and verified"
- "Template published"

### After delete

Snackbar: `success` severity, "Company deleted". Page navigates back to list.

### Notification delivery (200 response)

Inline `Alert severity="success"`:
```
✓ Notification delivered to all channels.
```

### Partial delivery (207 response)

Inline `Alert severity="warning"`:
```
⚠ Partial delivery. One or more channels failed. See results below.
```

---

## 17. Authentication Page Design

Auth pages use the `(auth)` route group layout — no sidebar, no topbar.

```
┌─────────────────────────────────────────────┐
│                                             │
│            background.default               │
│                                             │
│   ┌─────────────────────────────────────┐   │
│   │                                     │   │
│   │          [Logo / Icon]              │   │
│   │      Communication Portal           │   │
│   │                                     │   │
│   │  Email                              │   │
│   │  ┌─────────────────────────────┐   │   │
│   │  │                             │   │   │
│   │  └─────────────────────────────┘   │   │
│   │                                     │   │
│   │  Password                           │   │
│   │  ┌─────────────────────────────┐   │   │
│   │  │                             │   │   │
│   │  └─────────────────────────────┘   │   │
│   │                     Forgot password │   │
│   │                                     │   │
│   │  [      Sign in      ]              │   │
│   │                                     │   │
│   │  Don't have an account? Register    │   │
│   └─────────────────────────────────────┘   │
│        Card: 400px, elevation 0, outlined   │
└─────────────────────────────────────────────┘
```

- Card: 400px wide, `variant="outlined"`, `border-radius: 12px`, `padding: 40px`
- Logo: app icon (48px) + "Communication Portal" text (`h5`, centered)
- Full-width primary button
- Footer links: `caption` size, `text.secondary`
- Error: `Alert severity="error"` above the button

---

## 18. Dashboard Design

```
┌─── Topbar ─────────────────────────────────────────┐
├─── Sidebar ──┬── Main Content ─────────────────────┤
│              │                                      │
│              │  Dashboard          [Today ▼]        │
│              │                                      │
│              │  ┌──────┐ ┌──────┐ ┌──────┐ ┌────┐  │
│              │  │ Stat │ │ Stat │ │ Stat │ │Stat│  │
│              │  │  12  │ │ 243  │ │  87% │ │ 4  │  │
│              │  │comps │ │evts  │ │deliv.│ │errs│  │
│              │  └──────┘ └──────┘ └──────┘ └────┘  │
│              │                                      │
│              │  ┌── Notifications (7d) ───────────┐ │
│              │  │  [Line chart — Recharts]         │ │
│              │  └─────────────────────────────────┘ │
│              │                                      │
│              │  ┌── Per-Channel Breakdown ────────┐ │
│              │  │  [Bar chart — email/SMS/storage]│ │
│              │  └─────────────────────────────────┘ │
│              │                                      │
└──────────────┴──────────────────────────────────────┘
```

- 4 stat cards (row): `xs=12, sm=6, md=3` grid
- Each stat card: icon (top-left), large number (`h4`), label (`caption`), trend delta
- Line chart: 7-day notification volume by channel
- Bar chart: per-channel success/failure breakdown
- All chart data from placeholder (no dedicated dashboard API endpoint exists — aggregate from available endpoints in v1)

---

## 19. List Page Design

### Desktop / Tablet (≥ 600px)

```
┌── PageHeader ──────────────────────────────────────────┐
│  Companies (243)                    [+ New Company]    │
│  Companies / List                                       │
├── FilterBar ───────────────────────────────────────────┤
│  [🔍 Search...]  Status: [All ▼]  [Clear filters]      │
├── DataGrid ────────────────────────────────────────────┤
│  □  Name           Key         Status    Updated       │
│  ─────────────────────────────────────────────────     │
│  □  Acme Corp      acme        ● Active  2 days ago    │
│  □  Test Co        test-co     ○ Inactive 1 week ago   │
│  ...                                                   │
│  ─────────────────────────────────────────────────     │
│  Rows per page: [50▼]      1-50 of 243    [←] [→]     │
└───────────────────────────────────────────────────────┘
```

### Mobile (< 600px)

```
┌── PageHeader ─────────────────────────────────────┐
│  Companies (243)              [+ New Company]      │
├── FilterBar ──────────────────────────────────────┤
│  [🔍 Search...            ]                        │
│  Status: [All ▼]  [Clear]                         │
├── Card List ──────────────────────────────────────┤
│  ┌─────────────────────────────────────────────┐  │
│  │ Acme Corp                     ● Active      │  │
│  │ acme-corp                                   │  │
│  │ ─────────────────────────────────────────── │  │
│  │ Timezone    Australia/Sydney                │  │
│  │ Created     Jun 14, 2026                   │  │
│  │ ─────────────────────────────────────────── │  │
│  │ [✏ Edit]                    [🗑 Delete]     │  │
│  └─────────────────────────────────────────────┘  │
│  ┌─────────────────────────────────────────────┐  │
│  │ Test Co                       ○ Inactive    │  │
│  │ test-co                                     │  │
│  │ ...                                         │  │
│  └─────────────────────────────────────────────┘  │
├── Pagination ─────────────────────────────────────┤
│  [25 ▼]   1-25 of 243   [←]  [→]                 │
└───────────────────────────────────────────────────┘
```

**Rules that apply to both layouts:**
- Same route, same data hook, same permissions
- Same create/edit/delete drawer/dialog pattern
- `PermissionGuard` applies identically to table actions and card actions
- PageHeader count: `Companies (243)` — always visible
- `+ New Company` button: in PageHeader on both layouts (same `PermissionGuard` guard)

**Mobile-specific layout notes:**
- PageHeader stacks vertically if title + button don't fit in one row
- FilterBar fields stack vertically (`Stack direction="column"` on mobile)
- Cards are full-width
- Pagination sits below cards with `TablePagination` component

---

## 20. Detail Page Design

```
┌── PageHeader ──────────────────────────────────────────────┐
│  Acme Corp                  [Edit]  [Delete]  [Active ●]   │
│  Companies / Acme Corp                                      │
├────────────────────────────────────────────────────────────┤
│  ┌── Company Info ──────────────────────────────────────┐  │
│  │  Company Key       acme                              │  │
│  │  Display Name      Acme Corp                         │  │
│  │  Legal Name        Acme Corporation Pty Ltd          │  │
│  │  Timezone          Australia/Sydney                  │  │
│  │  Created           June 14, 2026                     │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                            │
│  ┌── Themes (3) ──────────────────────────────────[+ Add]─┐│
│  │  [mini DataGrid of themes]                            ││
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌── Domains (5) ─────────────────────────────[+ Add]────┐│
│  │  [mini DataGrid of domains]                           ││
│  └──────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────┘
```

- `KeyValueList` component for primary details
- Related entities as sub-DataGrids (no pagination on sub-grids for v1 — load all)
- "Toggle Active" button in header switches `isActive` inline via PATCH

---

## 21. Preview Screen Design

Used for template preview (`/layout-templates/[id]/preview`).

```
┌── PageHeader ──────────────────────────────────┐
│  Preview — Welcome Email         [← Back]      │
├─────────────────┬──────────────────────────────┤
│  Variables      │                              │
│  ─────────────  │                              │
│  company_name   │   [Rendered email HTML]      │
│  [Acme Corp  ]  │                              │
│                 │   (iframe or dangerouslySet  │
│  user_name      │    InnerHTML sanitized)      │
│  [John Doe   ]  │                              │
│                 │                              │
│  invoice_total  │                              │
│  [AU$1,250.00]  │                              │
│                 │                              │
│  [Refresh ↺]   │                              │
├─────────────────┴──────────────────────────────┤
│  Left panel: 380px fixed  |  Right: fills      │
└────────────────────────────────────────────────┘
```

- Left panel: 380px, scrollable variable fields
- Right panel: fills remaining width, shows rendered preview
- Preview refreshes automatically on variable change (debounced 500ms)
- "Refresh" button forces re-render
- Preview source: `GET /preview/layout`

---

## 22. Notification Testing Screen Design

```
┌── PageHeader ──────────────────────────────────────┐
│  Test Notification                                  │
│  Notifications / Test                               │
├─────────────────────────────────────────────────────┤
│  ┌── Step 1: Select Target ────────────────────┐    │
│  │  Company         [Autocomplete   ▼]         │    │
│  │  Event           [Autocomplete   ▼]         │    │
│  │  Email address   [input          ]          │    │
│  │  Phone number    [input (optional)]         │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ┌── Step 2: Variables ────────────────────────┐    │
│  │  [Dynamic fields from event.channelContent] │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│                          [Send Test Notification →] │
│                                                     │
│  ┌── Results ──────────────────────────────────┐    │
│  │                                             │    │
│  │  ✓ EMAIL via sendgrid    Delivered          │    │
│  │  ✗ SMS via twilio        Failed             │    │
│  │    Missing phone destination                │    │
│  │                                             │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

- Results appear below the form after send (not a modal)
- Per-channel accordion (expandable for error detail)
- `207 Multi-Status` → `Alert severity="warning"` above results
- `200 OK` → `Alert severity="success"` above results
- Channel result row: icon (✓/✗) + channel name + provider name + status chip + error text

---

## MUI Theme Summary (`mui-theme.ts`)

Key theme configuration for implementors:

```typescript
// palette
primary: { main: '#4263EB', dark: '#3451D1', light: '#6785F5', contrastText: '#FFFFFF' }
secondary: { main: '#7C3AED' }
success: { main: '#0EA66F' }
error: { main: '#DC2626' }
warning: { main: '#D97706' }
background: { default: '#F8FAFC', paper: '#FFFFFF' }
text: { primary: '#0F172A', secondary: '#64748B', disabled: '#94A3B8' }
divider: '#E2E8F0'

// typography
fontFamily: '"Inter", system-ui, -apple-system, sans-serif'
button: { textTransform: 'none', fontWeight: 500 }

// component overrides
MuiButton: { disableElevation: true, borderRadius: 6, textTransform: 'none' }
MuiCard: { variant: 'outlined', borderRadius: 8 }
MuiDialog: { maxWidth: 'sm', fullWidth: true, borderRadius: 12 }
MuiDataGrid: { border: 'none', borderRadius: 8 }
MuiChip: { borderRadius: 100, fontWeight: 500 }
MuiTextField: { size: 'medium', variant: 'outlined' }
```

---

## Dark Mode

Not implemented in v1. Light mode is the only supported mode. The theme uses `mode: 'light'`.

Dark mode may be added in v2 by wrapping the theme in a `ColorModeContext` — no structural changes to components required, as MUI handles dark-mode token mapping. When planned, create a new decision record.

---

## 23. Events Page Standards

> Added 2026-06-27. Governs the `/event-catalogue` page — the core of the notification system.

### 23a. Filter Bar

The filter bar sits above the DataTable and contains all context-level and client-side filters in a single horizontal row (desktop) or stacked column (mobile).

| Filter | Type | Scope |
|---|---|---|
| Domain | `TextField select` | Backend — drives which events are loaded |
| Search | `TextField` | Client-side — matches eventKey, displayName, description, domain name/key |
| Event Type | `TextField select` | Client-side — notification / alert / request / security |
| Channel | `TextField select` | Client-side — Email only / SMS only / Email + SMS / None |
| Status | `TextField select` | Client-side — Active / Inactive |
| Template Status | `TextField select` | Client-side — Configured / Missing content |
| Clear Filters | `Button` | Visible only when any client-side filter is active |

The domain filter auto-selects the first domain on page load. Changing the domain resets all other filters.

### 23b. Table Columns

| Column | Field | Width | Notes |
|---|---|---|---|
| Domain | populated `domainCatalogueId` | 130px | displayName + domainKey subtitle |
| Event Key | `eventKey` | flex:1 | Monospace font |
| Display Name | `displayName` | flex:1.5 | With description subtitle |
| Type | `eventType` | 120px | Color chip |
| Email | `channelContent.email` | 120px | `ChannelStatusChip` |
| SMS | `channelContent.sms` | 120px | `ChannelStatusChip` |
| Status | `isActive` | 100px | `StatusBadge` |
| Updated | `updatedAt` | 110px | Relative date |
| Actions | — | 160px | Preview + Edit + Delete |

### 23c. Channel Status Chip

Three states, rendered by `ChannelStatusChip`:

| Status | Condition | Color |
|---|---|---|
| Configured | `enabled=true` AND has content (+ subject for email) | `success` |
| Missing | `enabled=true` AND content/subject empty | `warning` |
| Disabled | `enabled=false` or channel not present | `default` |

### 23d. Preview Modal

Opened from both the table actions (Preview button, tooltip: "Preview message") and the form drawer footer.

- Dialog: `maxWidth="lg"`, `fullWidth`, `height: 90vh`
- **Email tab**: For saved events — layout template selector + API call to `POST /preview/notifications/email/html`. For unsaved (draft) — raw HTML in iframe with info banner.
- **SMS tab**: Phone-frame card with client-side variable substitution.
- **Variables tab**: Editable JSON. Changes propagate to Email subject and SMS preview in real-time.

Email preview endpoint: `POST /preview/notifications/email/html` — body: `{ layoutTemplateId, eventCatalogueId, mock?, payload? }` — returns raw HTML string.

### 23e. Form Drawer

Uses `FormDrawer` with `width={600}`. Three sections:

1. **Basic Information**: Domain (disabled on edit), Event Key (disabled on edit), Display Name, Event Type, Active switch, Description.
2. **Email Channel**: Toggle switch in section header. When enabled: Subject (required), HTML Content (required, monospace, 10 rows), Required/Optional Variables, Required/Optional Files.
3. **SMS Channel**: Toggle switch in section header. When enabled: SMS Content (required, with live char counter), Required/Optional Variables.

Footer actions: `Cancel` | `Preview` (disabled if no channel enabled) | `Save Changes` / `Create Event`.

Validation uses `superRefine`: email subject and content required when `emailEnabled=true`; SMS content required when `smsEnabled=true`.

---

## Related Documents

- [[Decisions/DEC-002 Frontend Stack]]
- [[Architecture]]
- [[Components]]
- [[UX]]
