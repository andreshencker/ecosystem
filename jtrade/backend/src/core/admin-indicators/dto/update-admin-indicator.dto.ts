import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateAdminIndicatorDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
