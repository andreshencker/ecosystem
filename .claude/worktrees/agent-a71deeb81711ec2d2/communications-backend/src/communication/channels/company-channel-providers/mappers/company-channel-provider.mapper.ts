import { CompanyChannelProviderResponseDto } from '../dto/company-channel-provider-response.dto';

export class CompanyChannelProviderMapper {
  static toResponse(doc: any): CompanyChannelProviderResponseDto {
    return {
      id: String(doc._id),

      companyId: String(doc.companyId),
      providerId: String(doc.providerId?._id ?? doc.providerId),
      channelId: String(doc.channelId?._id ?? doc.channelId),

      isDefault: Boolean(doc.isDefault),
      isActive: Boolean(doc.isActive),

      provider:
        doc.providerId && typeof doc.providerId === 'object'
          ? {
              id: String(doc.providerId._id),
              providerKey: doc.providerId.providerKey,
              displayName: doc.providerId.displayName,
              connectionType: doc.providerId.connectionType,
              isActive: doc.providerId.isActive,
              channelId: doc.providerId.channelId
                ? String(doc.providerId.channelId)
                : undefined,
            }
          : undefined,

      channel:
        doc.channelId && typeof doc.channelId === 'object'
          ? {
              id: String(doc.channelId._id),
              channelKey: doc.channelId.channelKey,
              displayName: doc.channelId.displayName,
              isActive: doc.channelId.isActive,
            }
          : undefined,

      createdAt: doc.createdAt
        ? new Date(doc.createdAt).toISOString()
        : new Date().toISOString(),
      updatedAt: doc.updatedAt
        ? new Date(doc.updatedAt).toISOString()
        : new Date().toISOString(),
    };
  }

  static toResponseList(list: any[]): CompanyChannelProviderResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
