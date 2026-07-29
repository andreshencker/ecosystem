import {
  ChannelRuntimeDto,
  EventCatalogueResponseDto,
} from '../dto/event-catalogue-response.dto';

function lower(v: any) {
  return String(v ?? '')
    .toLowerCase()
    .trim();
}

function str(v: any) {
  return String(v ?? '');
}

export class EventCatalogueMapper {
  static toResponse(doc: any): EventCatalogueResponseDto {
    const domain = doc.domainCatalogueId;

    const isPopulated =
      domain &&
      typeof domain === 'object' &&
      (domain._id || domain.id) &&
      domain.companyId;

    // ✅ runtime metadata (NO credentials)
    let channelsRuntime: ChannelRuntimeDto[] | undefined;

    if (isPopulated) {
      const list = Array.isArray(domain.channelsToUse)
        ? domain.channelsToUse
        : [];

      const mapped = list.map((x: any) => {
        const channel = lower(x?.channel);
        const pc = x?.providerCredentialsId;

        // si NO está populated, no podemos sacar providerKey/connectionType
        if (!pc || typeof pc !== 'object' || !(pc._id || pc.id)) {
          return null;
        }

        const pcId = str(pc._id ?? pc.id);

        const ccp = pc.companyChannelProviderId;
        const ccpId =
          ccp && typeof ccp === 'object' && (ccp._id || ccp.id)
            ? str(ccp._id ?? ccp.id)
            : ccp
              ? str(ccp)
              : undefined;

        const provider = ccp?.providerId;
        const channelDoc = ccp?.channelId;

        const providerId =
          provider &&
          typeof provider === 'object' &&
          (provider._id || provider.id)
            ? str(provider._id ?? provider.id)
            : ccp?.providerId
              ? str(ccp.providerId)
              : undefined;

        const channelId =
          channelDoc &&
          typeof channelDoc === 'object' &&
          (channelDoc._id || channelDoc.id)
            ? str(channelDoc._id ?? channelDoc.id)
            : ccp?.channelId
              ? str(ccp.channelId)
              : undefined;

        return {
          channel, // email/sms/storage
          providerCredentialsId: pcId,

          tag: pc.tag ? str(pc.tag) : undefined,

          // ✅ en tu sistema "undefined" se asume activo, y solo false desactiva
          credentialsIsActive: pc.isActive !== false,

          companyChannelProviderId: ccpId,

          providerId,
          providerKey: provider?.providerKey
            ? lower(provider.providerKey)
            : undefined,
          connectionType: provider?.connectionType
            ? lower(provider.connectionType)
            : undefined,

          channelId,
          channelKey: channelDoc?.channelKey
            ? lower(channelDoc.channelKey)
            : undefined,
        } as ChannelRuntimeDto;
      });

      const cleaned = mapped.filter(Boolean) as ChannelRuntimeDto[];

      // ✅ Si no hubo nada populated, mejor dejar undefined (para que sepas que no venía runtime)
      channelsRuntime = cleaned.length ? cleaned : undefined;
    }

    return {
      id: str(doc._id),

      domainCatalogueId: isPopulated
        ? {
            companyId: str(domain.companyId),
            domainKey: str(domain.domainKey ?? ''),
            displayName: str(domain.displayName ?? ''),
            domainCategory: str(domain.domainCategory ?? ''),
            isActive: domain.isActive !== false,

            channelsToUse: (domain.channelsToUse ?? []).map((x: any) => ({
              channel: lower(x?.channel),
              // ✅ soporta ObjectId o populate
              providerCredentialsId: str(
                x?.providerCredentialsId?._id ?? x?.providerCredentialsId,
              ),
            })),
          }
        : str(domain),

      eventKey: lower(doc.eventKey),
      displayName: str(doc.displayName),
      description: str(doc.description ?? ''),
      eventType: doc.eventType,

      channelContent: doc.channelContent ?? {},

      // ✅ metadata solamente
      channelsRuntime,

      scope: (doc.scope ?? 'company') as 'platform' | 'company',
      senderScope: (doc.senderScope ?? 'company') as 'platform' | 'company',

      isActive: doc.isActive !== false,

      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : '',
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : '',
    };
  }

  static toResponseList(list: any[]): EventCatalogueResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
