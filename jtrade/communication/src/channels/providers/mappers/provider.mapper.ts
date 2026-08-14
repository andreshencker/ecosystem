import { ProviderResponseDto } from '../dto/provider-response.dto';

export class ProviderMapper {
  static toResponse(doc: any): ProviderResponseDto {
    const channelPopulated =
      doc?.channelId && typeof doc.channelId === 'object' && doc.channelId._id;

    return {
      id: String(doc._id),
      providerKey: doc.providerKey,
      displayName: doc.displayName,

      channelId: channelPopulated
        ? String(doc.channelId._id)
        : String(doc.channelId),

      channel: channelPopulated
        ? {
            id: String(doc.channelId._id),
            channelKey: doc.channelId.channelKey,
            displayName: doc.channelId.displayName,
            isActive: doc.channelId.isActive,
          }
        : undefined,

      connectionType: doc.connectionType,
      isActive: doc.isActive,

      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    };
  }

  static toResponseList(list: any[]): ProviderResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
