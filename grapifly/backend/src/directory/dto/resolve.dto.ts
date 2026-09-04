export interface ResolveOrganizationsDto {
  organizationIds: string[];
}

export interface ResolveUsersDto {
  grapiflyUserIds: string[];
}

/** Non-sensitive organization display data — safe for permission-free lookup. */
export interface DirectoryOrganizationDto {
  organizationId: string;
  name: string;
  slug: string;
  status: 'active' | 'suspended' | 'archived';
  isPlatform: boolean;
  isDefault: boolean;
}

/** Non-sensitive user display data — no email. */
export interface DirectoryUserDto {
  grapiflyUserId: string;
  displayName: string;
  avatarUrl: string | null;
}
