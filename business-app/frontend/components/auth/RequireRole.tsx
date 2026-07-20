import React from 'react';
import { useAuthStore } from '@/stores/auth.store';
import type { UserRole } from '@/types/api';

interface RequireRoleProps {
  roles: UserRole | UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * Renders children only when the current user has one of the allowed roles.
 * Uses role-config.ts as the Single Source of Truth — no inline role logic
 * in consuming components.
 */
export function RequireRole({ roles, children, fallback = null }: RequireRoleProps) {
  const role = useAuthStore((s) => s.role);
  const allowed = Array.isArray(roles) ? roles : [roles];

  if (!role || !allowed.includes(role)) return <>{fallback}</>;
  return <>{children}</>;
}
