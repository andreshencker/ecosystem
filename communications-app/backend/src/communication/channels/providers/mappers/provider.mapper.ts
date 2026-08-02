import { ProviderResponseDto } from '../dto/provider-response.dto';

type ChannelRef = {
  _id: unknown;
  channelKey: string;
  displayName: string;
  isActive: boolean;
};

export class ProviderMapper {
  static toResponse(doc: Record<string, unknown>): ProviderResponseDto {
    const rawIds: unknown[] = Array.isArray(doc['channelIds'])
      ? (doc['channelIds'] as unknown[])
      : [];

    // Detect whether the elements are populated Channel documents.
    const firstPopulated =
      rawIds.length > 0 &&
      rawIds[0] !== null &&
      typeof rawIds[0] === 'object' &&
      '_id' in rawIds[0];

    const toIdStr = (ch: unknown): string =>
      firstPopulated ? String((ch as ChannelRef)._id) : String(ch);

    const channelId = rawIds.length > 0 ? toIdStr(rawIds[0]) : '';
    const channelIds = rawIds.map(toIdStr);

    const channels = firstPopulated
      ? rawIds.map((ch) => {
          const c = ch as ChannelRef;
          return {
            id: String(c._id),
            channelKey: c.channelKey,
            displayName: c.displayName,
            isActive: c.isActive,
          };
        })
      : undefined;

    return {
      id: String(doc['_id']),
      providerKey: String((doc['providerKey'] as string | undefined) ?? ''),
      displayName: String((doc['displayName'] as string | undefined) ?? ''),
      description:
        doc['description'] !== undefined
          ? String(doc['description'] as string)
          : undefined,

      channelId,
      channelIds,
      channel: channels?.[0],
      channels,

      connectionType: doc[
        'connectionType'
      ] as ProviderResponseDto['connectionType'],
      isActive: Boolean(doc['isActive']),

      createdAt: doc['createdAt'] as Date | undefined,
      updatedAt: doc['updatedAt'] as Date | undefined,
    };
  }

  static toResponseList(
    list: Record<string, unknown>[],
  ): ProviderResponseDto[] {
    return (list ?? []).map((x) => this.toResponse(x));
  }
}
