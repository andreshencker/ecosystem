import { StorageDomainCatalogueResponseDto } from '../dto/storage-domain-catalogue-response.dto';

export class StorageDomainCatalogueMapper {
  static toResponse(doc: any): StorageDomainCatalogueResponseDto {
    return {
      id: String(doc._id),
      companyId: String(doc.companyId),
      providerCredentialsId: String(doc.providerCredentialsId ?? ''),
      domainKey: String(doc.domainKey ?? ''),
      visibility: doc.visibility === 'private' ? 'private' : 'public',
      displayName: String(doc.displayName ?? ''),
      description: String(doc.description ?? ''),
      isActive: !!doc.isActive,
      isSystem: !!doc.isSystem,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    };
  }

  static toResponseList(list: any[]): StorageDomainCatalogueResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
