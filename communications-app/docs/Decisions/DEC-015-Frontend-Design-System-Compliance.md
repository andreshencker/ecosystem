---
id: DEC-015
title: Frontend Design System Compliance Rule
status: Accepted
created: 2026-06-25
tags: [frontend, design-system, architecture, ui]
---

# DEC-015 — Frontend Design System Compliance Rule

## Decision

All Communication Portal frontend pages **must follow the finalized Communication Frontend Design System** documented in `docs/Frontend/Design-System.md`.

The **Team page** (`app/(portal)/users/page.tsx`) is the current **implementation reference** for list-page layout until shared components fully replace page-level custom UI.

## Binding Rules

### 1. List page layout

Every list page must use this exact outer wrapper:

```tsx
<Box
  display="flex"
  flexDirection="column"
  flex={1}
  minHeight={0}
  sx={{ minWidth: 0, overflowX: 'hidden' }}
>
```

### 2. Filter area

Every filter row must use:

```tsx
<Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, flexShrink: 0 }}>
  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
    {/* TextField, FormControl, Clear button */}
  </Box>
</Paper>
```

- Search inputs: `size="small"`, `sx={{ width: { xs: '100%', sm: 200 } }}`
- Selects: `FormControl size="small"`, `sx={{ width: { xs: '100%', sm: 150 } }}`
- Clear button: only visible when `hasActiveFilters`, `variant="text"`

### 3. Responsive table

List pages must render **two sibling containers** (both in DOM):

```tsx
{/* Mobile cards (xs/sm — below md) */}
<Box sx={{ display: { xs: 'flex', md: 'none' }, ... }}>
  {/* Card list */}
</Box>

{/* Desktop DataGrid (md+) */}
<Box sx={{ display: { xs: 'none', md: 'flex' }, flex: '1 1 0', minHeight: 400, overflow: 'hidden' }}>
  <DataGrid ... />
</Box>
```

**Never use MUI Table/TableContainer for list pages.** Use `DataGrid` from `@mui/x-data-grid`.

### 4. DataGrid visual contract

```
border: 'none'
getRowHeight: () => 52
Column headers: fontWeight 600, 0.75rem, uppercase, text.secondary
Background header: background.default
borderBottom: '2px solid divider'
Row hover: action.hover
```

### 5. Empty state

Use the shared `EmptyState` component (not custom markup):
- Inside DataGrid: via `slots.noRowsOverlay`
- In mobile card view: directly in the card list area

### 6. What NOT to do

- Do not use plain `<Table>/<TableContainer>/<TableBody>` for list pages
- Do not use bare `<Stack spacing={N}>` as a filter container
- Do not use `<Box sx={{ maxWidth: 1200, mx: 'auto' }}>` as the page wrapper for list pages
- Do not invent new layout patterns — check the Team page first

## Rationale

The Team page was built first with the full design system in mind. All subsequent list pages must share the same visual language to create a consistent experience across Platform Admin and Business App surfaces.

Consistency reduces cognitive load for operators who switch between pages frequently.

## References

- `docs/Frontend/Design-System.md` — canonical source of truth
- `app/(portal)/users/page.tsx` — implementation reference
- ADR-002 — Global Responsive Standard
