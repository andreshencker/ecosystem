import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

/**
 * DTO for self-update via PATCH /users/me.
 * Intentionally excludes role, scope, companyId, businessKey, isActive —
 * those fields can only be changed by an admin via PATCH /users/:id.
 */
export class UpdateMeDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName?: string;

  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName?: string;
}
