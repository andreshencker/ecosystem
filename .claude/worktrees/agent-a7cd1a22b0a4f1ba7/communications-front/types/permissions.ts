// CONT-008 (DEC-008 A2.10): derivePermissions() referenced removed role 'company_user'.
// Removed. All permission lookups now go through getPermissions(role) from role-config.ts
// via hooks/usePermissions.ts.
//
// UserPermissions and UserRole are re-exported here for any legacy imports.
export type { UserPermissions } from '@/config/rbac/role-config';
export type { UserRole } from '@/types/api';
