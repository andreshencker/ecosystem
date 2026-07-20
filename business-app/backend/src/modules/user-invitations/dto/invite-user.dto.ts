import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * Roles that may be created via the invitation flow.
 * business_owner is excluded — it is created only via company self-registration.
 */
export type InvitableRole =
  'platform_admin' | 'business_admin' | 'accountant' | 'staff' | 'viewer';

export class InviteUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName!: string;

  @IsEnum(
    ['platform_admin', 'business_admin', 'accountant', 'staff', 'viewer'],
    {
      message:
        'role must be one of: platform_admin, business_admin, accountant, staff, viewer',
    },
  )
  role!: InvitableRole;

  /**
   * Required only when a platform_admin invites a business_admin
   * into a specific tenant company.
   */
  @IsOptional()
  @IsString()
  targetCompanyId?: string;

  @IsOptional()
  @IsString()
  targetBusinessKey?: string;
}
