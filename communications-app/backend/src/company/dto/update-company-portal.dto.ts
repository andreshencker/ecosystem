import {
  IsEmail,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
  MinLength,
} from 'class-validator';

/**
 * All editable fields of the Company schema.
 * companyKey, ownerUserId, createdByUserId, and isActive are excluded — they are
 * system-managed and cannot be changed through the portal edit form.
 */
export class UpdateCompanyPortalDto {
  // ── Basic ───────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  legalName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  tagline?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  timezone?: string;

  // ── Contact ─────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  supportPhone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  supportHours?: string;

  // ── Address ─────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine1?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  addressLine2?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressCity?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressState?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  addressPostalCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  addressCountry?: string;

  // ── URLs ────────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(300)
  webBaseUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  apiBaseUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  helpCenterUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  privacyPolicyUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  termsUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  unsubscribeUrl?: string;

  // ── Social media ────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(300)
  facebook?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  instagram?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  linkedin?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  x?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  youtube?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  tiktok?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  whatsapp?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  telegram?: string;

  // ── Legal ───────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(500)
  copyrightText?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  disclaimerShort?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  disclaimerLong?: string;

  // ── Logos ───────────────────────────────────────────────────────────────────
  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoIconUrl?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  logoFullUrl?: string;
}
