import {
  CompanyIntegrationPlatformViewDto,
  CompanyIntegrationResponseDto,
  CompanyIntegrationWithTokenDto,
} from '../dto/company-integration-response.dto';

function str(v: any): string {
  return String(v ?? '');
}

function toISO(v: any): string | null {
  if (!v) return null;
  return v instanceof Date ? v.toISOString() : String(v);
}

export class CompanyIntegrationMapper {
  static toResponse(doc: any): CompanyIntegrationResponseDto {
    return {
      id:             str(doc._id ?? doc.id),
      companyId:      str(doc.companyId),
      integrationKey: str(doc.integrationKey),
      displayName:    str(doc.displayName),
      description:    str(doc.description ?? ''),
      environment:    str(doc.environment ?? 'development'),
      tokenPrefix:    str(doc.tokenPrefix),
      isActive:       doc.isActive !== false,
      lastUsedAt:     toISO(doc.lastUsedAt),
      expiresAt:      toISO(doc.expiresAt),
      createdBy:      doc.createdBy ? str(doc.createdBy) : null,
      createdAt:      doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt:      doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    };
  }

  static toResponseWithToken(doc: any, rawToken: string): CompanyIntegrationWithTokenDto {
    return { ...this.toResponse(doc), rawToken };
  }

  static toResponseList(list: any[]): CompanyIntegrationResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }

  static toPlatformResponse(doc: any): CompanyIntegrationPlatformViewDto {
    const company = doc.companyId;
    const isPopulated = company && typeof company === 'object' && (company._id || company.id);
    return {
      ...this.toResponse({
        ...doc,
        // Pass the raw companyId ObjectId string when populated to avoid "[object Object]"
        companyId: isPopulated ? str(company._id ?? company.id) : str(company),
      }),
      companyDisplayName: isPopulated ? str(company.displayName) : '—',
      companyKey:         isPopulated ? str(company.companyKey)   : '—',
    };
  }

  static toPlatformResponseList(list: any[]): CompanyIntegrationPlatformViewDto[] {
    return (list ?? []).map((x) => this.toPlatformResponse(x));
  }
}
