// src/company-info/dto/create-company.dto.ts
import {
  IsBoolean,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
} from 'class-validator';

export class CreateCompanyDto {
  @IsString()
  @IsNotEmpty()
  companyKey!: string;

  @IsString()
  @IsNotEmpty()
  displayName!: string;

  @IsOptional()
  @IsString()
  legalName?: string;

  @IsOptional()
  @IsString()
  tagline?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  // Contact
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @IsOptional()
  @IsString()
  supportPhone?: string;

  @IsOptional()
  @IsString()
  supportHours?: string;

  // Address
  @IsOptional()
  @IsString()
  addressLine1?: string | null;

  @IsOptional()
  @IsString()
  addressLine2?: string | null;

  @IsOptional()
  @IsString()
  addressCity?: string | null;

  @IsOptional()
  @IsString()
  addressState?: string | null;

  @IsOptional()
  @IsString()
  addressPostalCode?: string | null;

  @IsOptional()
  @IsString()
  addressCountry?: string | null;

  // Urls
  @IsOptional()
  @IsUrl({ require_tld: false })
  webBaseUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  apiBaseUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  helpCenterUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  privacyPolicyUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  termsUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  unsubscribeUrl?: string;

  // Socials
  @IsOptional()
  @IsUrl({ require_tld: false })
  facebook?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  instagram?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  linkedin?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  x?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  youtube?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  tiktok?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  whatsapp?: string | null;

  @IsOptional()
  @IsUrl({ require_tld: false })
  telegram?: string | null;

  // Legal
  @IsOptional()
  @IsString()
  copyrightText?: string;

  @IsOptional()
  @IsString()
  disclaimerShort?: string;

  @IsOptional()
  @IsString()
  disclaimerLong?: string;

  // Logos ✅
  @IsOptional()
  @IsUrl({ require_tld: false })
  logoIconUrl?: string;

  @IsOptional()
  @IsUrl({ require_tld: false })
  logoFullUrl?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
