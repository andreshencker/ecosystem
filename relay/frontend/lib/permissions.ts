import { getPermissions } from '@/config/rbac/role-config';
import type { UserPermissions } from '@/config/rbac/role-config';
import type { UserRole } from '@/types/api';

/**
 * Non-hook permission checker — safe to call outside React components
 * (event handlers, utility functions, server-side logic).
 *
 * For React components, prefer the `usePermissions` hook or
 * the `<RequirePermission>` / `<PermissionGuard>` components.
 */
export function hasPermission(
  role: UserRole | null | undefined,
  permission: keyof UserPermissions,
): boolean {
  if (!role) return false;
  try {
    return getPermissions(role)[permission];
  } catch {
    return false;
  }
}

/**
 * Returns true when `currentRole` matches ANY of the given roles.
 */
export function hasRole(
  currentRole: UserRole | null | undefined,
  ...roles: UserRole[]
): boolean {
  if (!currentRole) return false;
  return roles.includes(currentRole);
}

/**
 * Returns true when the role has global (modules) scope.
 * Equivalent to `role === 'platform_admin'` but expressed semantically.
 */
export function isGlobalScope(role: UserRole | null | undefined): boolean {
  return role === 'platform_admin';
}

/**
 * Returns true when the role is company-scoped.
 */
export function isCompanyScope(role: UserRole | null | undefined): boolean {
  return (
    role === 'company_owner' ||
    role === 'company_admin' ||
    role === 'operator' ||
    role === 'viewer'
  );
}
