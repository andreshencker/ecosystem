// src/company-info/dto/company-response.dto.ts
export class CompanyResponseDto {
  id!: string;

  companyKey!: string;
  displayName!: string;
  legalName!: string;
  tagline!: string;
  timezone!: string;

  companyEmail!: string;
  supportEmail!: string;
  supportPhone!: string;
  supportHours!: string;

  addressLine1!: string | null;
  addressLine2!: string | null;
  addressCity!: string | null;
  addressState!: string | null;
  addressPostalCode!: string | null;
  addressCountry!: string | null;

  webBaseUrl!: string;
  apiBaseUrl!: string;
  helpCenterUrl!: string;
  privacyPolicyUrl!: string;
  termsUrl!: string;
  unsubscribeUrl!: string;

  facebook!: string | null;
  instagram!: string | null;
  linkedin!: string | null;
  x!: string | null;
  youtube!: string | null;
  tiktok!: string | null;
  whatsapp!: string | null;
  telegram!: string | null;

  copyrightText!: string;
  disclaimerShort!: string;
  disclaimerLong!: string;

  logoIconUrl!: string;
  logoFullUrl!: string;

  bankAccountHolder!: string;
  bankName!: string;
  bankAccountNumber!: string;
  bankSwiftBic!: string;
  bankCountry!: string;
  usdtWalletAddress!: string;
  usdtNetwork!: '' | 'TRC20' | 'ERC20' | 'BEP20';

  isActive!: boolean;

  createdAt!: string;
  updatedAt!: string;
}
