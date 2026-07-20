import type { UserRole } from './api';

export type { UserRole };

export interface UserPermissions {
  canViewAllCompanies: boolean;
  canCreateCompany: boolean;
  canEditCompany: boolean;
  canDeleteCompany: boolean;
  canDeactivateCompany: boolean;
  canManageThemes: boolean;
  canViewChannels: boolean;
  canManageProviders: boolean;
  canManageCredentials: boolean;
  canManageDomains: boolean;
  canManageEvents: boolean;
  canTestNotifications: boolean;
  canManageTemplates: boolean;
  canUploadMedia: boolean;
  canManageStorage: boolean;
  canGenerateReports: boolean;
  canAccessPlatformSettings: boolean;
}

export function derivePermissions(role: UserRole | null | undefined): UserPermissions {
  const isAdmin = role === 'platform_admin';
  const isCompanyAdmin = role === 'company_admin';
  const isUser = role === 'company_user';

  return {
    canViewAllCompanies:       isAdmin,
    canCreateCompany:          isAdmin,
    canEditCompany:            isAdmin || isCompanyAdmin,
    canDeleteCompany:          isAdmin,
    canDeactivateCompany:      isAdmin,
    canManageThemes:           isAdmin || isCompanyAdmin,
    canViewChannels:           isAdmin,
    canManageProviders:        isAdmin,
    canManageCredentials:      isAdmin || isCompanyAdmin,
    canManageDomains:          isAdmin || isCompanyAdmin,
    canManageEvents:           isAdmin || isCompanyAdmin,
    canTestNotifications:      isAdmin || isCompanyAdmin || isUser,
    canManageTemplates:        isAdmin || isCompanyAdmin,
    canUploadMedia:            isAdmin || isCompanyAdmin || isUser,
    canManageStorage:          isAdmin || isCompanyAdmin,
    canGenerateReports:        true,
    canAccessPlatformSettings: isAdmin,
  };
}
