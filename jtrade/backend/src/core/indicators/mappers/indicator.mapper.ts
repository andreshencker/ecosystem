import { IndicatorResponseDto } from '../dto/indicator-response.dto';

export class IndicatorMapper {
  static toResponse(doc: any, symbolNameById: Map<string, string>): IndicatorResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
    const pairs = Array.isArray(plain.pairs) ? plain.pairs : [];
    return {
      id: plain._id?.toString?.() ?? String(plain._id),
      providerOrganizationId: plain.providerOrganizationId,
      name: plain.name,
      key: plain.key,
      description: plain.description ?? '',
      webhookSlug: plain.webhookSlug ?? '',
      webhookLastReceivedAt: plain.webhookLastReceivedAt ?? null,
      pairs: pairs.map((pair: any) => {
        const symbolId = pair.symbolId?.toString?.() ?? String(pair.symbolId);
        return {
          id: pair._id?.toString?.() ?? String(pair._id),
          symbolId,
          symbol: symbolNameById.get(symbolId) ?? '',
          timeframe: pair.timeframe,
          buyKey: pair.buyKey ?? '',
          sellKey: pair.sellKey ?? '',
          enabled: pair.enabled !== false,
          lastSignalAt: pair.lastSignalAt ?? null,
        };
      }),
      isActive: plain.isActive,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  static toResponseList(list: any[], symbolNameById: Map<string, string>): IndicatorResponseDto[] {
    return list.map((item) => this.toResponse(item, symbolNameById));
  }
}
