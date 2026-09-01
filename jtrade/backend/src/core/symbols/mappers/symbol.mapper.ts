import { SymbolResponseDto } from '../dto/symbol-response.dto';

export class SymbolMapper {
  static toResponse(doc: any): SymbolResponseDto {
    const plain = typeof doc?.toObject === 'function' ? doc.toObject() : doc;
    return {
      id: plain._id?.toString?.() ?? String(plain._id),
      providerOrganizationId: plain.providerOrganizationId,
      symbol: plain.symbol,
      aliases: Array.isArray(plain.aliases) ? plain.aliases : [],
      isActive: plain.isActive,
      createdAt: plain.createdAt,
      updatedAt: plain.updatedAt,
    };
  }

  static toResponseList(list: any[]): SymbolResponseDto[] {
    return (list ?? []).map((item) => this.toResponse(item));
  }
}
