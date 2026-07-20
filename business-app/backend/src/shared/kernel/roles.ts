// ─── Canonical role and scope types — Single Source of Truth ─────────────────
// All modules import UserRole / UserScope from here.
// user.schema.ts re-exports these for backward compatibility with existing imports.

export type UserRole =
  | 'platform_admin'
  | 'business_owner'
  | 'business_admin'
  | 'accountant'
  | 'staff'
  | 'viewer';

export type UserScope = 'global' | 'company';

/** Runtime constants — use instead of magic strings when referencing roles in code. */
export const ROLES = {
  PLATFORM_ADMIN: 'platform_admin',
  BUSINESS_OWNER: 'business_owner',
  BUSINESS_ADMIN: 'business_admin',
  ACCOUNTANT: 'accountant',
  STAFF: 'staff',
  VIEWER: 'viewer',
} as const satisfies Record<string, UserRole>;

export const PLATFORM_ROLES: ReadonlyArray<UserRole> = [ROLES.PLATFORM_ADMIN];

export const BUSINESS_ROLES: ReadonlyArray<UserRole> = [
  ROLES.BUSINESS_OWNER,
  ROLES.BUSINESS_ADMIN,
  ROLES.ACCOUNTANT,
  ROLES.STAFF,
  ROLES.VIEWER,
];
