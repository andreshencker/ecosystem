import { DocumentCatalogueResponseDto } from '../dto/document-catalogue-response.dto';

export class DocumentCatalogueMapper {
  static toResponse(doc: any): DocumentCatalogueResponseDto {
    const domain = doc.documentDomainCatalogueId;
    const domainIsPopulated =
      domain && typeof domain === 'object' && !domain._bsontype;

    return {
      id: String(doc._id),
      documentDomainCatalogueId: domainIsPopulated ? domain : String(domain),
      documentKey: String(doc.documentKey ?? ''),
      displayName: String(doc.displayName ?? ''),
      description: String(doc.description ?? ''),
      formatContracts: doc.formatContracts ?? {},
      isActive: !!doc.isActive,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
      ...(domainIsPopulated ? { documentDomain: domain } : {}),
    };
  }

  static toResponseList(list: any[]): DocumentCatalogueResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
