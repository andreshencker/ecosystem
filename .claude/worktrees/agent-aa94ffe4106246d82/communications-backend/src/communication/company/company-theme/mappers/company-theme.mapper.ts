// src/company-theme/mappers/company-theme.mapper.ts
import { CompanyThemeResponseDto } from '../dto/company-theme-response.dto';

export class CompanyThemeMapper {
  static toResponse(doc: any): CompanyThemeResponseDto {
    return {
      id: String(doc._id),
      companyId: String(doc.companyId),
      label: doc.label,

      primaryColor: doc.primaryColor,
      secondaryColor: doc.secondaryColor,
      backgroundColor: doc.backgroundColor,
      surfaceColor: doc.surfaceColor,
      textColor: doc.textColor,
      mutedTextColor: doc.mutedTextColor,
      borderColor: doc.borderColor,
      linkColor: doc.linkColor,

      fontFamily: doc.fontFamily,
      fontSizeBase: doc.fontSizeBase,
      fontWeightNormal: Number(doc.fontWeightNormal),
      fontWeightBold: Number(doc.fontWeightBold),

      isDefault: !!doc.isDefault,
      isActive: !!doc.isActive,

      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }

  static toResponseList(list: any[]): CompanyThemeResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
