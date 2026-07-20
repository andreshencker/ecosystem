// src/layout-templates/dto/layout-template-response.dto.ts
import type { TemplateType } from '../schemas/layout-template.schema';

export type LayoutTemplateResponseDto = {
  id: string;
  companyThemeId: string;

  templateType: TemplateType;
  key: string;
  name: string;

  html: string;
  css: string;

  requiredVariables: string[];
  optionalVariables: string[];

  isDefault: boolean;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
};

export type LayoutTemplateContextResponseDto = {
  layout: LayoutTemplateResponseDto;

  // ✅ al mismo nivel (simple)
  theme?: any; // puedes tiparlo después si ya tienes CompanyThemeResponseDto
  company?: any; // idem CompanyResponseDto
};
