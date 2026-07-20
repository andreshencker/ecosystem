// src/layout-templates/mappers/layout-template.mapper.ts
import {
  LayoutTemplateContextResponseDto,
  LayoutTemplateResponseDto,
} from '../dto/layout-template-response.dto';

export class LayoutTemplateMapper {
  static toLayout(doc: any): LayoutTemplateResponseDto {
    return {
      id: String(doc._id),

      // ✅ soporta cuando viene populado (objeto) o sin populate (ObjectId)
      companyThemeId: String(doc.companyThemeId?._id ?? doc.companyThemeId),

      templateType: doc.templateType,
      key: doc.key,
      name: doc.name,

      html: doc.html,
      css: doc.css ?? '',

      requiredVariables: doc.requiredVariables ?? [],
      optionalVariables: doc.optionalVariables ?? [],

      isDefault: !!doc.isDefault,
      isActive: !!doc.isActive,

      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    };
  }

  static toLayoutList(list: any[]): LayoutTemplateResponseDto[] {
    return (list ?? []).map((x) => this.toLayout(x));
  }

  /**
   * ✅ Context:
   * - layout: companyThemeId string
   * - theme: full theme (but companyId as string)
   * - company: full company object (source of truth)
   */
  static toContext(doc: any): LayoutTemplateContextResponseDto {
    // companyThemeId puede venir:
    // - ObjectId (sin populate)
    // - objeto theme (populate)
    const themeObj =
      doc?.companyThemeId &&
      typeof doc.companyThemeId === 'object' &&
      (doc.companyThemeId as any)._id
        ? (doc.companyThemeId as any)
        : undefined;

    // theme.companyId puede venir:
    // - ObjectId
    // - objeto company (deep populate)
    const companyObj =
      themeObj?.companyId &&
      typeof themeObj.companyId === 'object' &&
      (themeObj.companyId as any)._id
        ? (themeObj.companyId as any)
        : undefined;

    // ✅ layout.companyThemeId siempre string (no objeto)
    const layoutRaw = {
      ...doc,
      companyThemeId: themeObj?._id ?? doc.companyThemeId,
    };

    // ✅ theme completo, pero companyId SOLO string (sin duplicar company dentro)
    const themeClean = themeObj
      ? {
          ...this.stripMongoMeta(themeObj),
          companyId: String(companyObj?._id ?? themeObj.companyId),
        }
      : undefined;

    // ✅ company full (source of truth)
    const companyClean = companyObj
      ? this.stripMongoMeta(companyObj)
      : undefined;

    return {
      layout: this.toLayout(layoutRaw),
      theme: themeClean,
      company: companyClean,
    };
  }

  private static stripMongoMeta(obj: any) {
    if (!obj || typeof obj !== 'object') return obj;
    const copy = { ...obj };
    delete (copy as any).__v;
    return copy;
  }
}
