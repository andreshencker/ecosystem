import { z } from 'zod';
import type { UserRole } from '@/types/api';

/**
 * Application context — determines which roles are visible in the Team page UI.
 *
 *   'modules' — the Platform Admin area (user has scope=global / no companyId).
 *                Only platform_admin users and roles are shown.
 *   'company'  — a Business App company view.
 *                Only company roles are shown; platform_admin is never surfaced.
 */
export type AppContext = 'platform' | 'company';

/**
 * Returns the roles this actor is permitted to invite, mirroring the server-side
 * INVITE_HIERARCHY in users.controller.ts. The backend enforces the same rules —
 * this is UX filtering only.
 *
 * Approved hierarchy (Decision 3, 4, 16):
 *   platform_admin → platform_admin, company_owner
 *   company_owner  → company_admin, operator, viewer
 *   company_admin  → operator, viewer
 *   operator/viewer → (none)
 */
/** All five roles — use only for super-admin surfaces that legitimately need all roles. */
export const ROLE_OPTIONS = [
  { value: 'platform_admin' as const, label: 'Platform Admin' },
  { value: 'company_owner'  as const, label: 'Company Owner'  },
  { value: 'company_admin'  as const, label: 'Company Admin'  },
  { value: 'operator'       as const, label: 'Operator'       },
  { value: 'viewer'         as const, label: 'Viewer'         },
] as const;

// ─── Team page helpers (/users) ───────────────────────────────────────────────
//
// The Team page (/users) is the unified invitation surface for all roles that
// can invite. Surface rules (DEC-014 §1a):
//
//   platform_admin  → invites other platform_admin                  (from /users)
//   company_owner   → invites company_admin, operator, viewer        (from /users)
//   company_admin   → invites operator, viewer                       (from /users)
//   operator/viewer → read-only; no invite
//
// company_owner is NEVER created from /users.
// company_owner is created exclusively from /global-users via "Create Company".

/**
 * Roles a Team-page actor may invite, keyed by their own role (DEC-014 §1a).
 *
 *   platform_admin → [platform_admin]
 *   company_owner  → [company_admin, operator, viewer]
 *   company_admin  → [operator, viewer]
 *   operator/viewer/null → []
 *
 * Invariant: company_owner is NEVER in this list.
 * It is created only from /global-users (Create Company form).
 */
export function getTeamInviteRoles(currentRole: UserRole | null) {
  switch (currentRole) {
    case 'platform_admin':
      return [
        { value: 'company_admin' as const, label: 'Relay Admin' },
        { value: 'operator'      as const, label: 'Operator' },
        { value: 'viewer'        as const, label: 'Viewer' },
      ];
    case 'company_owner':
      return [
        { value: 'company_admin' as const, label: 'Company Admin' },
        { value: 'operator'      as const, label: 'Operator'      },
        { value: 'viewer'        as const, label: 'Viewer'        },
      ];
    case 'company_admin':
      return [
        { value: 'operator' as const, label: 'Operator' },
        { value: 'viewer'   as const, label: 'Viewer'   },
      ];
    default:
      return [];
  }
}

/**
 * Whether the Invite User button is visible on the Team page.
 *
 *   platform_admin  → true  (invites other platform_admin)
 *   company_owner   → true  (invites company_admin, operator, viewer)
 *   company_admin   → true  (invites operator, viewer)
 *   operator/viewer → false (read-only)
 */
export function canInviteInBusinessApp(currentRole: UserRole | null): boolean {
  return (
    currentRole === 'platform_admin' ||
    currentRole === 'company_owner'  ||
    currentRole === 'company_admin'
  );
}

/**
 * Role filter options for the Team page dropdown — context-aware.
 *
 * Platform context (scope=global, no companyId):
 *   platform_admin → [platform_admin] only.
 *   Never shows company roles.
 *
 * Company context (scope=company):
 *   company_owner  → [company_admin, operator, viewer]
 *   company_admin  → [operator, viewer]
 *   platform_admin → [company_admin, operator, viewer]  (viewing a company team)
 *   operator/viewer → [] (read-only; no management)
 */
export function getVisibleRoleFilters(
  currentRole: UserRole | null,
  context: AppContext = 'company',
) {
  if (context === 'platform') {
    return currentRole === 'platform_admin'
      ? [{ value: 'platform_admin' as const, label: 'Platform Admin' }]
      : [];
  }
  // company context
  switch (currentRole) {
    case 'platform_admin':
    case 'company_owner':
      return [
        { value: 'company_admin' as const, label: 'Company Admin' },
        { value: 'operator'      as const, label: 'Operator'      },
        { value: 'viewer'        as const, label: 'Viewer'        },
      ];
    case 'company_admin':
      return [
        { value: 'operator' as const, label: 'Operator' },
        { value: 'viewer'   as const, label: 'Viewer'   },
      ];
    default:
      return [];
  }
}

/**
 * Roles an actor may assign when editing an existing user's role — context-aware.
 * Mirrors getTeamInviteRoles; an actor cannot assign a role they cannot invite.
 *
 * Platform context: platform_admin may only set role to platform_admin.
 * Company context:  same hierarchy as invite (company_owner → admin/op/viewer, etc.).
 */
export function getEditRoleOptions(
  currentRole: UserRole | null,
  context: AppContext = 'company',
) {
  if (context === 'platform') {
    return currentRole === 'platform_admin'
      ? [{ value: 'platform_admin' as const, label: 'Platform Admin' }]
      : [];
  }
  return getTeamInviteRoles(currentRole);
}

// ─── Global Users page helpers (/global-users — modules-admin surface) ───────
//
// The Global Users page manages modules-level accounts: platform_admin, company_owner.
// company_admin, operator, and viewer are NEVER created from this surface.

/**
 * Full invite hierarchy — for modules-level use (e.g. Global Users page future invite flow).
 * Mirrors server-side INVITE_HIERARCHY in users.controller.ts.
 *
 *   platform_admin → platform_admin, company_owner
 *   company_owner  → (delegates to company; not used on Global Users page)
 *   company_admin  → (delegates to company; not used on Global Users page)
 */
export function getAllowedInviteRoles(currentRole: UserRole | null) {
  switch (currentRole) {
    case 'platform_admin':
      return [
        { value: 'platform_admin' as const, label: 'Platform Admin' },
        { value: 'company_owner'  as const, label: 'Company Owner'  },
      ];
    case 'company_owner':
      return [
        { value: 'company_admin' as const, label: 'Company Admin' },
        { value: 'operator'      as const, label: 'Operator'       },
        { value: 'viewer'        as const, label: 'Viewer'         },
      ];
    case 'company_admin':
      return [
        { value: 'operator' as const, label: 'Operator' },
        { value: 'viewer'   as const, label: 'Viewer'   },
      ];
    default:
      return [];
  }
}

/**
 * Whether this role may invite users anywhere in the system.
 * For Team page button visibility use canInviteInBusinessApp instead.
 */
export function canInviteUsers(role: UserRole | null): boolean {
  return role === 'platform_admin' || role === 'company_owner' || role === 'company_admin';
}

// ─── Legacy (kept for callers that import these older names) ─────────────────

/** @deprecated Use getAllowedInviteRoles instead. */
export function getRoleOptionsForRole(currentRole: UserRole | null) {
  return getAllowedInviteRoles(currentRole);
}

/** @deprecated Use getVisibleRoleFilters instead. */
export function getVisibleRolesForRole(currentRole: UserRole | null, context: AppContext = 'company') {
  return getVisibleRoleFilters(currentRole, context);
}

export const updateUserSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  role: z
    .enum(['platform_admin', 'company_owner', 'company_admin', 'operator', 'viewer'])
    .optional(),
  isActive: z.boolean().optional(),
});

// company_owner is excluded: it can only be created via POST /companies/with-owner (DEC-013 Phase 3).
export const inviteUserSchema = z.object({
  email:           z.string().email('Valid email required'),
  firstName:       z.string().max(100).optional().default(''),
  lastName:        z.string().max(100).optional().default(''),
  role:            z.enum(['platform_admin', 'company_admin', 'operator', 'viewer'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
  // Reserved for future cross-company invitation flows (e.g. Global Users page).
  // For Team page invitations the backend resolves companyId from the actor JWT.
  targetCompanyId: z.string().optional(),
  targetCompanyKey:z.string().optional(),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
