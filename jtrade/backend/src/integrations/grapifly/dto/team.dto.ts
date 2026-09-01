import { IsEmail, IsIn, IsOptional } from 'class-validator';

export class InviteTeamMemberDto {
  @IsEmail() email!: string;
  @IsIn(['admin', 'member']) role!: 'admin' | 'member';
}

export class UpdateTeamMemberDto {
  @IsOptional() @IsIn(['admin', 'member']) role?: 'admin' | 'member';
  @IsOptional() @IsIn(['active', 'suspended', 'revoked']) status?: 'active' | 'suspended' | 'revoked';
}
