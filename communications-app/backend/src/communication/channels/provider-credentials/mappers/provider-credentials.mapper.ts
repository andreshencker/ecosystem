import { ProviderCredentialsResponseDto } from '../dto/provider-credentials-response.dto';

export class ProviderCredentialsMapper {
  static toResponse(doc: any): ProviderCredentialsResponseDto {
    // puede venir como ObjectId o como objeto poblado
    const ccp = doc.companyChannelProviderId;
    const ccpId =
      typeof ccp === 'object' && ccp !== null
        ? String(ccp._id ?? ccp.id)
        : String(ccp);

    const res: ProviderCredentialsResponseDto = {
      id: String(doc._id),
      companyChannelProviderId: ccpId,
      grapiflyOrganizationId: doc.grapiflyOrganizationId ?? null,
      tag: doc.tag,
      isActive: !!doc.isActive,
      displayIdentifier: doc.displayIdentifier ?? undefined,
      createdAt: doc.createdAt?.toISOString?.() ?? String(doc.createdAt),
      updatedAt: doc.updatedAt?.toISOString?.() ?? String(doc.updatedAt),
    };

    // si está poblado, adjuntamos el objeto (sin romper el formato anterior)
    if (typeof ccp === 'object' && ccp !== null) {
      const provider = ccp.providerId;
      const channel = ccp.channelId;

      res.companyChannelProvider = {
        id: String(ccp._id ?? ccp.id),
        companyId: String(ccp.companyId),
        grapiflyOrganizationId: ccp.grapiflyOrganizationId ?? null,
        isActive: !!ccp.isActive,

        provider: provider
          ? {
              id: String(provider._id ?? provider.id),
              providerKey: String(provider.providerKey),
              connectionType: String(provider.connectionType),
              displayName: provider.displayName,
            }
          : undefined,

        channel: channel
          ? {
              id: String(channel._id ?? channel.id),
              channelKey: String(channel.channelKey),
              displayName: channel.displayName,
            }
          : undefined,
      };
    }

    return res;
  }

  static toResponseList(list: any[]): ProviderCredentialsResponseDto[] {
    return (list ?? []).map((d) => this.toResponse(d));
  }
}
