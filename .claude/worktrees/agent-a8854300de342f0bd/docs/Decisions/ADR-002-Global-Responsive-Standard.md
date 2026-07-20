---
date: 2026-06-22
status: accepted
tags: [adr, architecture, frontend, responsive, ux]
---

# ADR-002: Global Responsive Standard

## Status

Accepted — 2026-06-22

## Context

Early portal pages used MUI `DataGrid` as the sole layout for all list views regardless of screen width. This caused two classes of problems:

1. **Horizontal overflow** — on screens below ~1000px, `DataGrid` column widths summed wider than the viewport, pushing a horizontal scrollbar onto the `<body>` rather than confining it inside the grid.
2. **Unusable actions** — action icon buttons in the rightmost column were clipped or unreachable on small screens.

The Team page (`/users`) was the first page where this failure was observed and addressed. The fix required both a card layout and a principled breakpoint strategy. Rather than fixing each page ad-hoc, a portal-wide standard was declared so all future pages are built consistently from the start.

A secondary problem was filter toolbar overflow: filter inputs had fixed pixel widths, so on narrow screens they overflowed their container rather than wrapping.

## Decision

Every portal list page must implement **both** a DataGrid layout (desktop) and a card/list layout (mobile), toggled by CSS `display` breakpoints. `useMediaQuery` is explicitly forbidden for this toggle because it causes hydration mismatches in Next.js SSR.

### Breakpoint Table

| Range | MUI name | Width | Layout |
|---|---|---|---|
| Mobile | `xs` | 0 – 599px | Card list |
| Tablet | `sm` | 600 – 899px | Card list |
| Laptop / Desktop | `md+` | ≥ 900px | DataGrid |

The switch point is MUI `md` (900px). Cards are used below 900px; DataGrid is used at 900px and above.

### CSS Toggle Pattern

Both containers must always be present in the DOM. CSS `display` switches which one is visible:

```tsx
{/* Card list — visible below 900px */}
<Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', flex: '1 1 0', minHeight: 0, overflowY: 'auto' }}>
  {/* card rows */}
</Box>

{/* DataGrid — visible at 900px and above */}
<Box sx={{ display: { xs: 'none', md: 'flex' }, flex: '1 1 0', minHeight: 400, overflow: 'hidden' }}>
  <DataGrid ... />
</Box>
```

This approach avoids `useMediaQuery` and eliminates SSR hydration mismatches.

### Overflow Rules

| Container | Rule |
|---|---|
| Outer page container | `sx={{ minWidth: 0, overflowX: 'hidden' }}` — prevents any child from widening the page |
| Card list container | `overflowY: 'auto'` — internal vertical scroll only |
| DataGrid wrapper | `overflow: 'hidden'` — DataGrid manages its own internal horizontal scroll; the wrapper must not let DataGrid bleed into the body scroll |

### Filter Toolbar

Filter inputs must use responsive widths so they wrap gracefully rather than overflow:

```tsx
<Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
  <TextField sx={{ width: { xs: '100%', sm: 200 } }} />
  <FormControl sx={{ width: { xs: '100%', sm: 150 } }} />
  <Button sx={{ width: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }} />
</Box>
```

Rules:
- On `xs`: inputs are full-width, stacked vertically.
- On `sm+`: inputs use fixed pixel widths and wrap naturally within the flex container.
- The "Clear filters" button is full-width on mobile, auto on desktop, and uses `whiteSpace: 'nowrap'` to prevent label wrapping.

### Card Layout Requirements

Each card must contain:
- **Header row:** primary identifier (name/title) + status chip, space-between.
- **Meta row:** secondary fields (role, company, date) separated by `·` bullets.
- **Action row:** icon buttons, right-aligned.

Pagination in card mode uses simple Prev/Next icon buttons with a `x–y of total` label. The same `page` and `pageSize` state used by the DataGrid drives the card slice:

```ts
const paginatedRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);
```

### DataGrid Layout Requirements

- All column definitions use `flex` or explicit `width` — no unconstrained columns.
- `minWidth` set on flex columns to prevent columns becoming too narrow to read.
- Action column: fixed width (148px), `sortable: false`, `align: 'right'`.
- Row click opens a view drawer (`onRowClick`). Action buttons stop propagation.

### Reference Implementation

The Team page (`app/(portal)/users/page.tsx`) is the **canonical reference** for this standard. All other portal list pages must follow the same pattern before being marked complete.

### Testing Requirement

Every page must be visually verified at these four widths before it is considered done:

| Width | Category |
|---|---|
| 1440px | Large desktop |
| 1024px | Laptop |
| 768px | Tablet |
| 390px | Mobile (iPhone 14 Pro) |

## Consequences

### Positive

- No horizontal body overflow on any page at any viewport width.
- Mobile users get a purpose-built card layout, not a clipped table.
- Consistent breakpoint means developers only need to learn one pattern.
- CSS-only toggle avoids React hydration issues.

### Negative

- Every new list page requires writing both a DataGrid column definition and a card component — approximately 30–50% more code per page.
- Testing requirement adds time to each page's implementation cycle.

### Neutral

- The `sm` (600–899px) range shows cards, not a DataGrid-with-scroll as an earlier draft of this standard proposed. The simpler breakpoint (one switch at 900px vs two switches at 600px and 900px) was chosen to reduce implementation complexity.

## Related

- [[Decisions]] — full ADR index
- [[ADR-003 Top Navigation Simplification]] — topbar also follows responsive rules
