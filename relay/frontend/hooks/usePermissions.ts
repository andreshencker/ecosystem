'use client';

import { useAuthStore } from '@/stores/auth.store';
import { getPermissions, type UserPermissions } from '@/config/rbac/role-config';

const DENY_ALL: UserPermissions = {
  canViewAllCompanies:       false,
  canViewOwnCompany:         false,
  canCreateCompany:          false,
  canEditCompany:            false,
  canDeleteCompany:          false,
  canDeactivateCompany:      false,
  canManageThemes:           false,
  canViewChannels:           false,
  canManageProviders:        false,
  canManageCredentials:      false,
  canManageDomains:          false,
  canManageEvents:           false,
  canTestNotifications:      false,
  canManageTemplates:        false,
  canUploadMedia:            false,
  canManageStorage:          false,
  canGenerateReports:        false,
  canAccessPlatformSettings: false,
  canManageUsers:            false,
  canInviteUsers:            false,
  canDeactivateUsers:        false,
  canDeleteUsers:            false,
  canTransferOwnership:      false,
  canViewAuditLogs:          false,
};

export function usePermissions(): UserPermissions {
  const role = useAuthStore((s) => s.user?.role);
  if (!role) return DENY_ALL;
  return getPermissions(role);
}
