import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateUserPlatformDto {
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  // No se permite cambiar isDefault aquí (usa endpoint dedicado)
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
