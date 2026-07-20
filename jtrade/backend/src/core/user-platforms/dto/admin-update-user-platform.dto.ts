import { IsBoolean, IsOptional } from 'class-validator';

export class AdminUpdateUserPlatformDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
