import { DomainCatalogueResponseDto } from '../dto/domain-catalogue-response.dto';

export class DomainCatalogueMapper {
  static toResponse(doc: any): DomainCatalogueResponseDto {
    return {
      id: String(doc._id),

      companyId: String(doc.companyId),
      domainKey: String(doc.domainKey ?? ''),
      displayName: String(doc.displayName ?? ''),
      domainCategory: String(doc.domainCategory ?? ''),

      isActive:  !!doc.isActive,
      isSystem:  !!doc.isSystem,

      channelsToUse: (doc.channelsToUse ?? []).map((x: any) => ({
        channel: x.channel,
        providerCredentialsId: String(x.providerCredentialsId),
      })),

      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    };
  }

  static toResponseList(list: any[]): DomainCatalogueResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
