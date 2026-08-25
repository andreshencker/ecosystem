// src/company-info/mappers/company.mapper.ts
import { CompanyResponseDto } from '../dto/company-response.dto';

export class CompanyMapper {
  static toResponse(doc: any): CompanyResponseDto {
    return {
      id: String(doc?._id ?? doc?.id),

      companyKey: doc.companyKey,
      displayName: doc.displayName,
      legalName: doc.legalName ?? '',
      tagline: doc.tagline ?? '',
      timezone: doc.timezone ?? 'Australia/Sydney',

      companyEmail: doc.companyEmail ?? '',
      supportEmail: doc.supportEmail ?? '',
      supportPhone: doc.supportPhone ?? '',
      supportHours: doc.supportHours ?? '',

      addressLine1: doc.addressLine1 ?? null,
      addressLine2: doc.addressLine2 ?? null,
      addressCity: doc.addressCity ?? null,
      addressState: doc.addressState ?? null,
      addressPostalCode: doc.addressPostalCode ?? null,
      addressCountry: doc.addressCountry ?? null,

      webBaseUrl: doc.webBaseUrl ?? '',
      apiBaseUrl: doc.apiBaseUrl ?? '',
      helpCenterUrl: doc.helpCenterUrl ?? '',
      privacyPolicyUrl: doc.privacyPolicyUrl ?? '',
      termsUrl: doc.termsUrl ?? '',
      unsubscribeUrl: doc.unsubscribeUrl ?? '',

      facebook: doc.facebook ?? null,
      instagram: doc.instagram ?? null,
      linkedin: doc.linkedin ?? null,
      x: doc.x ?? null,
      youtube: doc.youtube ?? null,
      tiktok: doc.tiktok ?? null,
      whatsapp: doc.whatsapp ?? null,
      telegram: doc.telegram ?? null,

      copyrightText: doc.copyrightText ?? '',
      disclaimerShort: doc.disclaimerShort ?? '',
      disclaimerLong: doc.disclaimerLong ?? '',

      logoIconUrl: doc.logoIconUrl ?? '',
      logoFullUrl: doc.logoFullUrl ?? '',

      isActive: doc.isActive ?? true,

      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    };
  }

  static toResponseList(list: any[]): CompanyResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
