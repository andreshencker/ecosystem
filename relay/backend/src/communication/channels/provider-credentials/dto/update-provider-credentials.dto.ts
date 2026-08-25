import {
  IsBoolean,
  IsIn,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class UpdateProviderCredentialsDto {
  @IsOptional()
  @IsString()
  tag?: string;

  // si lo mandas, re-valida y re-encripta
  @IsOptional()
  @IsObject()
  credentials?: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /** See CreateProviderCredentialsDto.oauthAppSource. */
  @IsOptional()
  @IsIn(['ecosystem', 'own'])
  oauthAppSource?: 'ecosystem' | 'own';
}
