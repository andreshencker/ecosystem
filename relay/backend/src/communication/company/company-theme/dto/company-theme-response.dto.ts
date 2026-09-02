// src/company-theme/dto/company-theme-response.dto.ts
export class CompanyThemeResponseDto {
  id!: string;
  companyId!: string;
  grapiflyOrganizationId!: string | null;

  primaryColor!: string;
  secondaryColor!: string;
  backgroundColor!: string;
  surfaceColor!: string;
  textColor!: string;
  mutedTextColor!: string;
  borderColor!: string;
  linkColor!: string;
  label!: string;

  fontFamily!: string;
  fontSizeBase!: string;
  fontWeightNormal!: number;
  fontWeightBold!: number;

  isDefault!: boolean;
  isActive!: boolean;

  createdAt!: string;
  updatedAt!: string;
}
