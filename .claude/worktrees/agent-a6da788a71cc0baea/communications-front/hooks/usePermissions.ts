'use client';

import { useAuthStore } from '@/stores/auth.store';
import { derivePermissions } from '@/types/permissions';
import type { UserPermissions } from '@/types/permissions';

export function usePermissions(): UserPermissions {
  const role = useAuthStore((s) => s.user?.role);
  // Default to platform_admin during development until backend returns role.
  // TODO: remove dev default once backend includes role in auth response.
  const effectiveRole = role ?? 'platform_admin';
  return derivePermissions(effectiveRole);
}
