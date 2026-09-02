import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import type { UserPermissions } from '@/config/rbac/role-config';

interface RequirePermissionProps {
  permission: keyof UserPermissions;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the current user holds the specified permission.
 * All permission logic is delegated to getPermissions(role) from role-config.ts.
 */
export function RequirePermission({ permission, children, fallback = null }: RequirePermissionProps) {
  const permissions = usePermissions();
  if (!permissions[permission]) return <>{fallback}</>;
  return <>{children}</>;
}
