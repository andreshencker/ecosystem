import type { UserRole, UserScope } from '../schemas/ecosystem-user.schema';

export class EcosystemUserResponseDto {
  id!: string;
  grapiflyUserId!: string | null;
  email!: string;
  firstName!: string;
  lastName!: string;
  avatarUrl!: string | null;
  role!: UserRole;
  scope!: UserScope;
  companyId!: string | null;
  companyKey!: string | null;
  isActive!: boolean;
  isEmailVerified!: boolean;
  mustChangePassword!: boolean;
  createdAt!: Date;

  static from(user: any): EcosystemUserResponseDto {
    const dto = new EcosystemUserResponseDto();
    dto.id = String(user._id ?? user.id);
    dto.grapiflyUserId = user.grapiflyUserId ?? null;
    dto.email = user.email;
    dto.firstName = user.firstName;
    dto.lastName = user.lastName;
    dto.avatarUrl = user.avatarUrl ?? null;
    dto.role = user.role;
    dto.scope = user.scope;
    dto.companyId = user.companyId ?? null;
    dto.companyKey = user.companyKey ?? null;
    dto.isActive = user.isActive ?? true;
    dto.isEmailVerified = user.isEmailVerified ?? false;
    dto.mustChangePassword = user.mustChangePassword ?? false;
    dto.createdAt = user.createdAt;
    return dto;
  }
}
