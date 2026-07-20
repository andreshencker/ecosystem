import { z } from 'zod';
import type { UserRole } from '@/types/api';

/**
 * Application context — determines which roles are visible in the Team page UI.
 *
 *   'modules' — the Platform Admin area (scope=global).
 *                Only platform_admin users are shown.
 *   'company'  — a Business App company view.
 *                Only company roles are shown; platform_admin is never surfaced.
 */
export type AppContext = 'platform' | 'company';

/** All roles — for surfaces that legitimately need the full list. */
export const ROLE_OPTIONS = [
  { value: 'platform_admin' as const, label: 'Platform Admin'  },
  { value: 'business_owner' as const, label: 'Business Owner'  },
  { value: 'business_admin' as const, label: 'Business Admin'  },
  { value: 'accountant'     as const, label: 'Accountant'      },
  { value: 'staff'          as const, label: 'Staff'           },
  { value: 'viewer'         as const, label: 'Viewer'          },
] as const;

// ─── Team page invite helpers ─────────────────────────────────────────────────
//
// Invite hierarchy (mirrors server-side INVITE_HIERARCHY):
//   platform_admin → platform_admin, business_admin (with targetCompanyId)
//   business_owner → business_admin, accountant, staff, viewer
//   business_admin → accountant, staff, viewer
//   accountant / staff / viewer → (none)
//
// business_owner is NEVER created from the Team page.
// It is created exclusively via company self-registration.

export function getTeamInviteRoles(currentRole: UserRole | null) {
  switch (currentRole) {
    case 'platform_admin':
      return [
        { value: 'platform_admin' as const, label: 'Platform Admin' },
      ];
    case 'business_owner':
      return [
        { value: 'business_admin' as const, label: 'Business Admin' },
        { value: 'accountant'     as const, label: 'Accountant'     },
        { value: 'staff'          as const, label: 'Staff'          },
        { value: 'viewer'         as const, label: 'Viewer'         },
      ];
    case 'business_admin':
      return [
        { value: 'accountant' as const, label: 'Accountant' },
        { value: 'staff'      as const, label: 'Staff'      },
        { value: 'viewer'     as const, label: 'Viewer'     },
      ];
    default:
      return [];
  }
}

export function canInviteInBusinessApp(currentRole: UserRole | null): boolean {
  return (
    currentRole === 'platform_admin' ||
    currentRole === 'business_owner' ||
    currentRole === 'business_admin'
  );
}

export function getVisibleRoleFilters(
  currentRole: UserRole | null,
  context: AppContext = 'company',
) {
  if (context === 'platform') {
    return currentRole === 'platform_admin'
      ? [{ value: 'platform_admin' as const, label: 'Platform Admin' }]
      : [];
  }
  switch (currentRole) {
    case 'platform_admin':
    case 'business_owner':
      return [
        { value: 'business_admin' as const, label: 'Business Admin' },
        { value: 'accountant'     as const, label: 'Accountant'     },
        { value: 'staff'          as const, label: 'Staff'          },
        { value: 'viewer'         as const, label: 'Viewer'         },
      ];
    case 'business_admin':
      return [
        { value: 'accountant' as const, label: 'Accountant' },
        { value: 'staff'      as const, label: 'Staff'      },
        { value: 'viewer'     as const, label: 'Viewer'     },
      ];
    default:
      return [];
  }
}

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

export function getAllowedInviteRoles(currentRole: UserRole | null) {
  switch (currentRole) {
    case 'platform_admin':
      return [
        { value: 'platform_admin' as const, label: 'Platform Admin'  },
        { value: 'business_owner' as const, label: 'Business Owner'  },
      ];
    case 'business_owner':
      return [
        { value: 'business_admin' as const, label: 'Business Admin' },
        { value: 'accountant'     as const, label: 'Accountant'     },
        { value: 'staff'          as const, label: 'Staff'          },
        { value: 'viewer'         as const, label: 'Viewer'         },
      ];
    case 'business_admin':
      return [
        { value: 'accountant' as const, label: 'Accountant' },
        { value: 'staff'      as const, label: 'Staff'      },
        { value: 'viewer'     as const, label: 'Viewer'     },
      ];
    default:
      return [];
  }
}

export function canInviteUsers(role: UserRole | null): boolean {
  return (
    role === 'platform_admin' ||
    role === 'business_owner' ||
    role === 'business_admin'
  );
}

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
  lastName:  z.string().min(1).max(100).optional(),
  role: z
    .enum(['platform_admin', 'business_owner', 'business_admin', 'accountant', 'staff', 'viewer'])
    .optional(),
  isActive: z.boolean().optional(),
});

// business_owner is excluded: created only via company self-registration.
export const inviteUserSchema = z.object({
  email:            z.string().email('Valid email required'),
  firstName:        z.string().min(1, 'Required').max(100),
  lastName:         z.string().min(1, 'Required').max(100),
  role:             z.enum(['platform_admin', 'business_admin', 'accountant', 'staff', 'viewer'], {
    errorMap: () => ({ message: 'Please select a role' }),
  }),
  targetCompanyId:  z.string().optional(),
  targetBusinessKey: z.string().optional(),
});

export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type InviteUserFormData = z.infer<typeof inviteUserSchema>;
