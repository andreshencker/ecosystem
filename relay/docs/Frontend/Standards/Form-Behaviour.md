# Frontend Form Behaviour Standard

| Field | Value |
|---|---|
| Last Updated | 2026-06-27 |
| Governs | `communications-front` |
| Visual baseline | [Design-System.md](../Design-System.md) §10–§17, [UX.md](../UX.md) §2, §7 |
| Related | [Authentication.md](../Authentication.md), [Components.md](../Components.md), [State-Management.md](../State-Management.md) |
| Status | Canonical |

> **Purpose:** This document defines mandatory *behaviour* for every form and CRUD screen in `communications-front`. Visual styling (colors, spacing, typography, layout) is governed by [Design-System.md](../Design-System.md). Do not look here for visual specifications; look here for state machines, error handling rules, and acceptance criteria.

---

## 1. Form Lifecycle

Every form passes through the following states. No state may be skipped.

### 1.1 State Machine

```
INITIAL
  │
  ├─ user types / changes a field
  │     └── DIRTY (unsaved changes present)
  │
  ├─ user blurs a field
  │     └── field-level validation fires → FIELD_ERROR (if invalid)
  │
  └─ user clicks Submit
        └── form-level validation fires
              ├── validation fails → VALIDATION_ERROR (submit blocked, errors shown)
              └── validation passes
                    └── LOADING (API call in flight)
                          ├── API error → ERROR (form stays open, user input preserved)
                          │     └── user corrects → DIRTY → re-submits
                          └── API success → SUCCESS
                                └── feedback shown → RESET / CLOSE
```

### 1.2 State Definitions

| State | Description | UI Requirements |
|---|---|---|
| **INITIAL** | Form freshly opened, no user input yet | Fields empty or pre-filled (edit mode). No errors visible. Submit enabled. |
| **DIRTY** | At least one field changed from initial value | Unsaved-changes guard active on drawer/dialog close. |
| **FIELD_ERROR** | Single field failed blur-time validation | Field border red, `helperText` error shown. Other fields unaffected. |
| **VALIDATION_ERROR** | Client-side validation failed on submit attempt | All failing fields show errors. Submit button re-enabled so user can correct and retry. |
| **LOADING** | API call in flight | Submit button shows spinner and is disabled. Form fields are disabled. No second submit possible. |
| **ERROR** | API returned an error | Error `Alert` rendered above submit button. Field-level backend errors mapped to their fields. User input preserved exactly as entered. Drawer stays open. |
| **SUCCESS** | API call succeeded | Success snackbar shown. Drawer/dialog closed. Relevant query cache invalidated. |
| **RESET** | Drawer fully closed after success or cancel | React Hook Form `reset()` called. Form returns to INITIAL for next open. |

### 1.3 Validation Trigger Rules

| Trigger | Action |
|---|---|
| Field blur (`onBlur`) | Validate that field only. Other fields unchanged. |
| Form submit | Validate all fields. Block submit and display all errors if any field fails. |
| API 422 / structured validation error response | Map backend `errors` array to field-level errors via `mapValidationErrors()`. |

---

## 2. Mandatory Form Rules

Every form in `communications-front` **must** comply with all of the following. There are no exceptions unless an approved exemption is recorded in §9.1.

### 2.1 Required Field Validation

- Every required field must be declared in the Zod schema with a descriptive, non-empty error message.
- The `required` prop must be passed to all `ControlledTextField`, `ControlledSelect`, and `ControlledAutocomplete` instances for required fields.
- The `*` required marker must be visible in the field label (MUI renders this automatically via `required` prop).

### 2.2 Field-Level Error Display

- Field errors must appear as `helperText` on the field that failed.
- Errors must be visible immediately after the user leaves (blurs) an invalid field.
- Errors must not appear before the user has interacted with a field — no pre-emptive errors on mount.
- Pattern: `error={!!fieldState.error}` and `helperText={fieldState.error?.message}` on every Controlled form component.

### 2.3 Form-Level API Error Display

- When the API returns a non-validation error (5xx, unexpected 4xx), render `<FormError message={...} />` or `<Alert severity="error">` directly above the submit button.
- The message content must come from `mapApiError(error)` — never expose raw `error.message` strings.
- The form-level error must be cleared automatically when the user re-submits.

### 2.4 Submit Button Disabled While Loading

- The submit button must use `<LoadingButton loading={formState.isSubmitting}>`.
- While `isSubmitting` is `true`, the button is disabled and shows a spinner automatically.
- Do not manage a separate `loading` state variable alongside `formState.isSubmitting` — they will diverge.

### 2.5 Prevent Double Submit

- React Hook Form prevents double submit automatically when the submit handler is `async` and returns a Promise.
- Never add a separate `submitting` flag or `e.preventDefault()` guard around the RHF submit handler.
- `formState.isSubmitting` is the single source of truth for in-flight state.

### 2.6 Preserve User Input After Failure

- On API error, never call `reset()` or `setValue()` to alter field values.
- The user's typed values must remain in all fields exactly as entered.
- Only the error display changes — no field values, field focus, or drawer open state changes.
- The drawer must remain open.

### 2.7 Success Feedback

- On success, show a `GlobalSnackbar` toast: `ui.store.showSnackbar({ message: '...', severity: 'success' })`.
- Message must name the entity and action: e.g. "Company created", "Template updated", "Event deleted".
- Close the drawer only after the success snackbar is triggered — never close before confirming success.
- Invalidate the relevant TanStack Query cache immediately after success.

### 2.8 Backend Validation Error Mapping

- When the API returns 422 (or a 400 with a structured `errors` array), pass the response through `mapValidationErrors(errors)` and apply the result via RHF `setError`.
- Mapped field errors must appear on the specific form field, not in the form-level error zone.
- If a backend error references a field not present in the form, collect it under the `_form` key and display it in the form-level error zone.

---

## 3. Login Form Standard

The login form at `/auth/login` carries additional requirements beyond the general form rules above.

### 3.1 Error Messages

| Scenario | Required Message |
|---|---|
| HTTP 401 (invalid credentials) | `"Invalid email or password."` |
| HTTP 403 (unverified email) | `"Please verify your email before logging in."` |
| Network error / no response from server | `"Cannot reach the server. Please try again."` |
| HTTP 500 | `"Something went wrong. Please try again later."` |
| Any other error | `"An unexpected error occurred. Please try again."` |

### 3.2 Field-Level Errors

| Scenario | Required Behavior |
|---|---|
| Email empty on submit | Field error: `"Email is required."` |
| Email invalid format | Field error: `"Enter a valid email address."` |
| Password empty on submit | Field error: `"Password is required."` |

All field errors appear via the standard RHF + Zod validation flow (§2.2). They block submit independently of the API call.

### 3.3 Loading Behavior

- The "Sign in" button must use `<LoadingButton>` and be disabled for the full duration of the API call.
- Form fields must remain **enabled** during loading — the user should be able to see and copy their entered values.

### 3.4 Silent Failure Prohibition

- The login form must **never** silently absorb a failure.
- Every error path (field validation, API error, network error) must produce a visible message.
- The submit button must never appear to complete a request that actually failed.

### 3.5 Password Field Behavior

- The password field must **never** be cleared unless an error is displayed simultaneously.
- On a 401 response, the password value remains in the field alongside the error Alert. The user can correct their credentials without re-typing the full password.
- On success, both fields are cleared implicitly as the component unmounts during navigation.

### 3.6 Auth State Persistence Order

The following sequence is **mandatory** and must not be reordered:

```
1. API returns 200 + { accessToken, refreshToken, user }
2. auth.store.setAuth(user, accessToken)          ← Zustand store populated
3. localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken)
4. authCookie.set(accessToken)                    ← cookie written (enables middleware)
5. router.push(getRoleConfig(user.role).landingPage) ← redirect last
```

Redirect must only happen after steps 2–4 complete. If any persistence step throws, the error must be caught, displayed as a form-level Alert, and navigation must not proceed.

---

## 4. CRUD Screen Standard

Every CRUD list page must provide all of the following. A page missing any item is not complete.

### 4.1 Required States

| State | Implementation |
|---|---|
| **Loading** | `<DataTable loading={isLoading}>` — renders skeleton rows (desktop) or skeleton cards (mobile) |
| **Empty** | `<DataTable emptyState={<EmptyState ...>}>` — contextual icon, title, description, primary action |
| **Error** | `<DataTable error={error}>` — renders `<QueryError>` with a retry button |
| **Data** | `<DataTable rows={data?.items} total={data?.total}>` — DataGrid on desktop, card list on mobile |

### 4.2 Required Actions

| Action | Implementation |
|---|---|
| Retry on error | `<QueryError onRetry={refetch}>` — calls TanStack Query `refetch()` |
| Create | `<FormDrawer>` opened via "New [Entity]" button in `<PageHeader actions={...}>` |
| Edit | `<FormDrawer>` opened via row Edit icon action |
| Delete | `<ConfirmDialog danger>` opened via row Delete icon action |
| Success feedback | `GlobalSnackbar` success toast after any successful mutation |
| Error feedback | `GlobalSnackbar` error toast or inline `<Alert severity="error">` on mutation failure |

### 4.3 Backend Validation Mapping

- All mutation errors must be passed through `mapApiError()`.
- 422 responses must additionally be passed through `mapValidationErrors()`, with the result applied via `setError` on the open `FormDrawer` form.
- The `FormDrawer` must stay open after a validation error so the user can correct their input.

### 4.4 Pagination

- All list pages use server-side pagination via `<DataTable>`.
- Default page size: 50. Options: `[25, 50, 100]`.
- Page state flows through TanStack Query as `(limit, offset)` parameters.
- `total` from the API response is passed to `<DataTable total={...}>` to drive pagination controls.
- **MUI DataGrid Community maximum:** `pageSize` must never exceed **100**. The shared `DataTable` clamps any value to `Math.min(pageSize, 100)` internally. Backend limits are irrelevant — the frontend grid is capped at 100 regardless.

### 4.5 Responsive Layout

- Every `<DataTable>` usage for a business entity list **must** provide `mobileCardConfig`.
- Desktop (≥ 600 px): DataGrid with full column definitions.
- Mobile (< 600 px): Card list with `primaryText`, `secondaryText`, `badge`, and 2–4 `fields`.
- Both presentations use the same data hook, the same permission guards, and the same row actions. No separate mobile component exists.

### 4.6 Drawer Lifecycle

| Condition | Behavior |
|---|---|
| Drawer opened for Create | Form starts in INITIAL state — all fields empty |
| Drawer opened for Edit | Form pre-filled via `reset(entityData)` on open |
| Mutation succeeds | Close drawer, show success snackbar, invalidate query |
| Mutation fails | Keep drawer open, show error Alert, preserve all field values |
| User closes drawer with `dirty` form | `FormDrawer dirty={isDirty}` triggers unsaved-changes confirmation |
| User closes drawer with pristine form | Close immediately, call `reset()` |

---

## 5. API Error Mapping Standard

All API errors must be translated through `mapApiError(error)` before being shown to the user. The messages below are required. A custom override is acceptable only when the generic message is actively misleading in the given context.

### 5.1 HTTP Status to UX Message Map

| HTTP Status | Required UX Message |
|---|---|
| **400 Bad Request** | `"The request could not be processed. Please check your input."` |
| **401 Unauthorized** (global / non-login context) | `"Your session has expired. Please sign in again."` |
| **401 Unauthorized** (login form) | `"Invalid email or password."` — see §3.1 |
| **403 Forbidden** | `"You do not have permission to perform this action."` |
| **404 Not Found** | `"The requested item could not be found."` |
| **409 Conflict** | `"This already exists. Please use a different value."` — override with entity-specific message when the API provides one (e.g. `"This email is already registered."`) |
| **422 Unprocessable Entity** | Map individual field errors via `mapValidationErrors()`. If no field mapping resolves, show `"Some fields are invalid. Please review and resubmit."` |
| **500 Internal Server Error** | `"Something went wrong on our end. Please try again later."` |
| **Network error** (request sent, no response) | `"Cannot reach the server. Please check your connection and try again."` |
| **Unknown error** | `"An unexpected error occurred. Please try again."` |

### 5.2 `mapApiError()` Contract

```typescript
function mapApiError(error: unknown): string
```

- Accepts any thrown value (Axios error, native `Error`, unknown).
- Reads `error.response?.status` to select the appropriate message.
- Detects network errors via `error.request` present but `error.response` absent.
- Falls back to the unknown error message when no case matches.
- Never throws. Always returns a non-empty string.

### 5.3 `mapValidationErrors()` Contract

```typescript
function mapValidationErrors(
  errors: { field: string; message: string }[]
): Record<string, string>
```

- Accepts the `errors` array from a 422 response body.
- Returns a map of `{ fieldName: errorMessage }`.
- The caller applies the result with RHF `setError(fieldName, { message })`.
- Fields that do not exist in the form are collected into the `_form` key for display in the form-level error zone.

### 5.4 Notification Duration Policy

**Every notification must eventually auto-dismiss. No toast stays permanently visible.**

Durations are enforced by `GlobalSnackbar` and `mapApiErrorDuration()`. Callers may pass `duration` on individual `pushSnack` calls to override the default.

#### Default durations by type

| Snack type | Auto-hide | Notes |
|---|---|---|
| `success` | **3 000 ms** | Routine confirmation; dismiss quickly |
| `warning` | **5 000 ms** | Needs a moment to read |
| `error` (default) | **8 000 ms** | Server errors and network errors |
| `info` | **4 000 ms** | Informational; medium duration |

#### Duration override for API errors

The global `mutationCache.onError` handler uses `mapApiErrorDuration(error)` to pick a shorter duration for business/validation errors:

| HTTP status range | Duration |
|---|---|
| 4xx (validation, conflict, not found) | **6 000 ms** — message is actionable, user corrects quickly |
| 5xx and network errors | **8 000 ms** — may require retry decision |

#### `mapApiErrorDuration()` Contract

```typescript
function mapApiErrorDuration(error: unknown): number
```

- Returns `6000` for 4xx responses.
- Returns `8000` for 5xx, network errors, or unknown errors.
- Never returns `null` — every error auto-dismisses.

#### Manual close

All snackbars include a manual close button (`onClose` on the `Alert`). The user can always dismiss before the timer fires. Clickaway (clicking outside) is ignored to prevent accidental dismissal.

---

## 6. Mutation Feedback Standard

### 6.1 Create

| Step | Required Behavior |
|---|---|
| Submit | `LoadingButton` enters loading state. All form fields disabled. |
| Success | Show snackbar: `"[Entity] created"`. Close drawer. Invalidate list query. Call `reset()`. |
| Error | Show `mapApiError()` message in drawer's form-level error zone. Keep drawer open. All field values preserved. |

### 6.2 Update

| Step | Required Behavior |
|---|---|
| Submit | `LoadingButton` enters loading state. All form fields disabled. |
| Success | Show snackbar: `"[Entity] updated"`. Close drawer. Invalidate both list and detail queries. Call `reset()`. |
| Error | Show `mapApiError()` message in drawer's form-level error zone. Keep drawer open. All field values preserved. |

### 6.3 Delete

| Step | Required Behavior |
|---|---|
| Row Delete action clicked | Open `<ConfirmDialog danger>` |
| User confirms | `ConfirmDialog` confirm button enters loading state |
| Success | Close dialog. Show snackbar: `"[Entity] deleted"`. Invalidate list query. |
| Error | Close dialog. Show `GlobalSnackbar` error toast. Do not re-open the dialog. |

### 6.4 Query Invalidation

- After every successful mutation, call `queryClient.invalidateQueries({ queryKey: [...] })` with the relevant list query key.
- After a successful update, also invalidate the detail query if one exists for the entity.
- Do not use optimistic updates for destructive operations (delete, deactivate). Invalidate and refetch.

### 6.5 Drawer Close Policy

| Condition | Drawer Behavior |
|---|---|
| Mutation succeeds | Close immediately after success snackbar is triggered |
| Mutation fails | Stay open — **never close on error** |
| User presses Escape | Close if form is pristine; show unsaved-changes warning if `isDirty` |
| User clicks backdrop | Same as Escape |
| User clicks Cancel | Same as Escape |

---

## 7. Authentication / Session Error Standard

### 7.1 Expired Access Token

- The Axios interceptor in `lib/axios.ts` automatically detects 401 responses on protected API calls.
- It attempts exactly one `POST /auth/refresh` using the stored refresh token.
- **Refresh success:** retry the original request with the new access token. The user sees nothing.
- **Refresh failure:** call `clearAuth()`, redirect to `/auth/login`. No inline error shown on the failed page — the login page is the feedback surface.

### 7.2 Refresh Token Success

The following steps must all complete before the original request is retried:

```
1. auth.store.setAuth(user, newAccessToken)
2. localStorage.setItem(REFRESH_TOKEN_KEY, newRefreshToken)
3. authCookie.set(newAccessToken)
```

Then retry the original request with the new `Authorization` header.

### 7.3 Refresh Token Failure

```
1. clearAuth()                                 ← resets all Zustand auth state to null / false
2. localStorage.removeItem(REFRESH_TOKEN_KEY)  ← cookie cleared inside clearAuth()
3. router.push('/auth/login')
```

No toast is shown. The redirect is the only signal.

### 7.4 Explicit Logout

```
1. POST /auth/logout { refreshToken }  — fire-and-forget (do not await)
2. clearAuth()
3. localStorage.removeItem(REFRESH_TOKEN_KEY)
4. router.push('/auth/login')
```

- Logout must not wait for the API call to complete.
- If the API call fails, the local logout still completes in full.

### 7.5 Middleware Redirect

- Next.js middleware reads the `comm_portal_at` cookie.
- Cookie absent → redirect to `/auth/login`.
- Cookie present but route not allowed for the role → redirect to `getRoleConfig(role).landingPage`.
- Both redirects are silent — no error message appears on the destination page.

### 7.6 Session Restore on Page Load

```
App mounts
  └── accessToken absent from Zustand store
  └── REFRESH_TOKEN_KEY present in localStorage
  └── Show <LoadingPage /> (full-screen spinner) while hydrating
  └── POST /auth/refresh
        success → setAuth(user, newAccessToken), update cookie → proceed to render
        failure → clearAuth() → router.push('/auth/login')
```

- `<LoadingPage />` must cover the full viewport for the entire hydration window.
- No portal content may render until `isAuthenticated` is resolved to `true`.

### 7.7 LocalStorage and Cookie Roles

| Storage | Purpose |
|---|---|
| Zustand store (memory) | Primary access token store for in-flight API requests |
| `comm_portal_at` cookie (non-HttpOnly) | Middleware session detection only — not the security boundary |
| `comm_portal_rt` in `localStorage` | Refresh token — survives page refresh |

Writing the cookie is the responsibility of `lib/auth-cookie.ts`. Do not write it from components.

### 7.8 React StrictMode Double Refresh Prevention

React StrictMode fires `useEffect` twice in development, which can trigger two concurrent refresh calls. The Axios interceptor must guard against this:

- Use a module-level `let isRefreshing = false` flag.
- Queue any requests that arrive while `isRefreshing` is `true` in a `failedRequestQueue` array.
- When the single refresh resolves, replay the queue with the new token and clear the flag.
- A second `POST /auth/refresh` must **never** be issued while one is already in flight.

---

## 8. Shared Utilities and Components

The following shared utilities and components exist for reuse across all pages. No page may reimplement equivalent behavior locally — it must use these.

### 8.1 Required Components

| Component | Location | Purpose |
|---|---|---|
| `FormDrawer` | `components/shared/FormDrawer` | Right-side drawer for create/edit forms. Handles width, header, scrollable content, footer, and unsaved-changes guard. |
| `ConfirmDialog` | `components/shared/ConfirmDialog` | Confirmation modal for destructive actions. Forbidden to use `window.confirm`. |
| `EmptyState` | `components/shared/EmptyState` | Empty list/page placeholder with contextual icon, title, description, and primary action. |
| `QueryError` | `components/shared/QueryError` | Data fetch failure display with `Alert` and retry button. Used inside `DataTable` or standalone. |
| `GlobalSnackbar` | `components/shared/GlobalSnackbar` | Renders the toast queue from `ui.store`. Placed once in `app/(portal)/layout.tsx`. |
| `LoadingButton` | `@mui/lab/LoadingButton` | Submit button with integrated loading spinner. Required for all form submit actions. |
| `FormError` | `components/shared/FormError` | Renders `<Alert severity="error">` when `message` is defined. Used for form-level API errors inside drawers. |

### 8.2 Required Utilities

| Utility | Location | Purpose |
|---|---|---|
| `mapApiError(error)` | `lib/mapApiError.ts` | Translates any thrown error into a user-facing string per §5.1. |
| `mapValidationErrors(errors)` | `lib/mapValidationErrors.ts` | Converts a 422 `errors` array into an RHF-compatible `{ fieldName: message }` map. |
| `useCrudFeedback()` | `hooks/useCrudFeedback.ts` | Helper hook encapsulating success snackbar, query invalidation, and drawer close for all mutation outcomes. |

### 8.3 `useCrudFeedback()` Contract

```typescript
interface CrudFeedbackOptions {
  successMessage: string;      // e.g. "Company created"
  queryKeys: QueryKey[];       // keys to invalidate on success
  onSuccess?: () => void;      // e.g. close drawer
}

function useCrudFeedback(options: CrudFeedbackOptions): {
  onSuccess: () => void;
  onError: (error: unknown) => string; // returns mapped error string
}
```

Example usage:

```typescript
const { onSuccess, onError } = useCrudFeedback({
  successMessage: 'Company created',
  queryKeys: [['companies']],
  onSuccess: closeDrawer,
});

const mutation = useMutation({
  mutationFn: createCompany,
  onSuccess,
  onError: (error) => setFormError(onError(error)),
});
```

---

## 9. Implementation Rule

> **No page may implement custom form error handling or mutation feedback behavior unless an approved exception is recorded in §9.1.**

Any proposed deviation must:

1. Be discussed and agreed before implementation begins.
2. Be added as a named exception in §9.1 with a clear rationale.
3. Cite the specific reason the standard cannot be followed in that case.

### 9.1 Approved Exceptions

_No exceptions at time of writing (2026-06-27)._

---

## 10. Acceptance Checklist

Every new CRUD page must pass all items in this checklist before it is considered complete. Each item must be verifiable by reading the implementation — "it works" is not sufficient.

### 10.1 List Page

- [ ] Loading state renders skeleton rows/cards (`DataTable loading={isLoading}`)
- [ ] Empty state renders `<EmptyState>` with contextual message and primary action
- [ ] Error state renders `<QueryError onRetry={refetch}>` with functional retry
- [ ] DataGrid present on desktop (≥ 600 px) with correct column definitions
- [ ] Mobile card view present (< 600 px) via `mobileCardConfig` prop
- [ ] Pagination wired via TanStack Query with `(limit, offset)` and `total` count
- [ ] "New [Entity]" button wrapped in `<PermissionGuard>`
- [ ] Row Edit action opens `<FormDrawer>` pre-filled with entity data
- [ ] Row Delete action opens `<ConfirmDialog danger>`
- [ ] `PageHeader` shows entity count: `Entity Name (count)`

### 10.2 Create Drawer

- [ ] Uses `<FormDrawer>` component
- [ ] All required fields declared in Zod schema with descriptive messages
- [ ] `<LoadingButton>` used for submit; disabled during `formState.isSubmitting`
- [ ] Field-level errors shown via `helperText` on blur
- [ ] Form-level API error shown via `<FormError>` or `<Alert severity="error">` above submit button
- [ ] Error cleared when user re-submits
- [ ] On success: snackbar shown, drawer closed, list query invalidated
- [ ] On error: drawer stays open, user input fully preserved, error displayed
- [ ] Backend 422 errors mapped to field-level errors via `mapValidationErrors()` + `setError`
- [ ] `dirty` prop passed to `FormDrawer` to activate unsaved-changes guard

### 10.3 Edit Drawer

- [ ] All items from Create Drawer checklist
- [ ] Form pre-filled with current entity values via `reset(entityData)` on open
- [ ] Entity detail query invalidated on success (in addition to list query)

### 10.4 Delete Dialog

- [ ] Uses `<ConfirmDialog danger>` — `window.confirm` is forbidden
- [ ] Confirm button uses `loading` prop while delete mutation is in flight
- [ ] On success: dialog closed, snackbar shown (`"[Entity] deleted"`), list query invalidated
- [ ] On error: dialog closed, `GlobalSnackbar` error toast shown

### 10.5 Error Handling

- [ ] All API errors routed through `mapApiError()` before display
- [ ] 422 responses routed through `mapValidationErrors()` and applied via `setError`
- [ ] No raw `error.message` or `error.response.data` strings shown directly to users
- [ ] Network errors produce `"Cannot reach the server. Please check your connection and try again."`

### 10.6 Authentication

- [ ] No portal content renders before `isAuthenticated` is resolved
- [ ] Session hydration shows `<LoadingPage>` for the full duration of the refresh call
- [ ] 401 API responses are handled by the Axios interceptor, not by page-level `catch` blocks

---

## 10. CRUD Table Actions

Every CRUD list page must use `<RowActions>` from `components/shared` for its action cell. This is not optional — ad-hoc `Stack`/`Box` wrappers with custom spacing are a design violation.

### 10.1 Canonical pattern

```tsx
import { RowActions } from '@/components/shared';

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

### 10.2 Rules

- **Gap**: always 12 px between buttons (enforced by `RowActions`, never set manually).
- **Touch target**: `RowActions` applies `width: 36px; height: 36px` to every `IconButton` child — do not override.
- **Border-radius**: `6px` (applied by `RowActions` — matches Design System button radius).
- **`stopPropagation`**: when used inside a custom `DataGrid` `renderCell` (not the shared `DataTable`), pass `onClick={(e) => e.stopPropagation()}` to `<RowActions>`. The shared `DataTable` handles this automatically.
- **Column width**: use `160px` for columns with 2–3 action buttons; `180px` for 4+ buttons. `DataTable.__actions__` column defaults to `160px`.
- **Colors**: Test/Verify → `color="primary"`, View → default, Edit → default, Delete → `color="error"`. See Design System §9b for the full table.
- **Tooltips**: every `IconButton` inside `RowActions` must have a `Tooltip` with a descriptive label.

### 10.3 Pages currently using RowActions (as of 2026-06-27)

| Page | File | Button count |
|---|---|---|
| Companies | `companies/page.tsx` | 3 |
| Global Users | `global-users/page.tsx` | 4 |
| Users (Team) | `users/page.tsx` | 2–4 |
| Providers | `providers/page.tsx` | 2 |
| Enabled Providers | `company-channel-providers/page.tsx` | 2 |
| Company Themes | `company/themes/page.tsx` | 2 |
| Provider Credentials | `provider-credentials/page.tsx` | 3 |
| Domains | `domain-catalogue/page.tsx` | 2 |
| Events | `event-catalogue/page.tsx` | 2 |
| Templates | `layout-templates/page.tsx` | 2–6 |

All future CRUD pages must follow this pattern. The `RowActions` component is the single source of truth for action cell layout.

---

## 6. Event Form Patterns

> Added 2026-06-27. Specific rules for the Events CRUD page (`/event-catalogue`).

### 6.1 Multi-Section Drawer

The event form uses `FormDrawer` (`width={600}`) with three explicit sections separated by `<Divider>`:

1. **Basic Information** — Domain, Event Key, Display Name, Event Type, Active, Description
2. **Email Channel** — switch in section header; fields revealed when enabled
3. **SMS Channel** — switch in section header; fields revealed when enabled

### 6.2 Conditional Validation

Use Zod `superRefine` for channel-dependent validation:

- `emailSubject` and `emailContent` are **required** only when `emailEnabled = true`
- `smsContent` is **required** only when `smsEnabled = true`
- Do **not** validate channel fields when their channel switch is off

### 6.3 Lock Rules

| Field | Create | Edit |
|---|---|---|
| `domainCatalogueId` | Selectable (dropdown) | Disabled — cannot change |
| `eventKey` | Required slug input | Disabled — cannot change |
| `isActive` | Visible, defaults true | Visible — can toggle |

### 6.4 SMS Character Counter

Display live character count in the `helperText` of the SMS content field:

- Normal color when `length ≤ 160`
- `warning.main` color when `length > 160`
- Append ` · N msgs` suffix when `length > 160` (using 153-char segment size)

### 6.5 Preview Button

The footer must include a `Preview` button between `Cancel` and `Save`:

- **Disabled** when neither `emailEnabled` nor `smsEnabled`
- Opens `PreviewModal` — does **not** require saving first
- In create mode: draft preview (raw HTML, no layout)
- In edit mode: full preview via `POST /preview/notifications/email/html`

### 6.6 Email Content Field

- `multiline`, `rows={10}`, `InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.82rem' } }}`
- Accepts raw HTML. Variables use `{{data.variable}}`, `{{company.name}}`, `{{theme.primaryColor}}` syntax.
- No WYSIWYG editor — monospace textarea keeps templates auditable.

---

## Related Documents

- [Design-System.md](../Design-System.md) — visual specification for form fields, drawers, toasts, alerts, error states, §9b Actions Column, and §23 Events page standards
- [UX.md](../UX.md) — global interaction patterns, modal/drawer behavior, empty state rules
- [Components.md](../Components.md) — prop signatures for all shared components referenced in this document
- [Authentication.md](../Authentication.md) — full auth flow, token storage strategy, session hydration
- [State-Management.md](../State-Management.md) — Zustand store structure, `ui.store` snackbar API
