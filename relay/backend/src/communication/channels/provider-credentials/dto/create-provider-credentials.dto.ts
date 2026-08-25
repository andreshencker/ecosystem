import {
  IsBoolean,
  IsIn,
  IsMongoId,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateProviderCredentialsDto {
  @IsMongoId()
  companyChannelProviderId!: string;

  @IsString()
  @IsNotEmpty()
  tag!: string;

  // payload plano (antes de encriptar)
  @IsObject()
  credentials!: Record<string, any>;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  /**
   * OAuth providers only: which auth-mode tab the frontend saved this
   * credential from. Not part of `credentials` (never encrypted/validated
   * by the contract) — stored in plain text purely so the UI can render an
   * accurate "Connected" state per tab. Falls back to auto-detection from
   * `credentials` when omitted (e.g. non-tabbed OAuth providers like Xero).
   */
  @IsOptional()
  @IsIn(['ecosystem', 'own'])
  oauthAppSource?: 'ecosystem' | 'own';
}
