import { DocumentDomainCatalogueResponseDto } from '../dto/document-domain-catalogue-response.dto';

export class DocumentDomainCatalogueMapper {
  static toResponse(doc: any): DocumentDomainCatalogueResponseDto {
    return {
      id: String(doc._id),
      companyId: String(doc.companyId),
      domainKey: String(doc.domainKey ?? ''),
      displayName: String(doc.displayName ?? ''),
      description: String(doc.description ?? ''),
      domainCategory: String(doc.domainCategory ?? ''),
      allowedFormats: Array.isArray(doc.allowedFormats)
        ? doc.allowedFormats
        : [],
      isActive: !!doc.isActive,
      isSystem: !!doc.isSystem,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    };
  }

  static toResponseList(list: any[]): DocumentDomainCatalogueResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
