// src/modules/user-invitations/dto/invite-user.dto.ts

import {
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export type InvitableRole =
  | 'platform_admin'
  | 'company_admin'
  | 'operator'
  | 'viewer';

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

  @IsEnum(['platform_admin', 'company_admin', 'operator', 'viewer'], {
    message:
      'role must be one of: platform_admin, company_admin, operator, viewer',
  })
  role!: InvitableRole;

  /**
   * Required only when a platform_admin invites a company_admin
   * into a specific tenant company.
   */
  @IsOptional()
  @IsString()
  targetCompanyId?: string;

  @IsOptional()
  @IsString()
  targetCompanyKey?: string;
}