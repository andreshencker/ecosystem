import { SymbolDocument } from '../schemas/symbol.schema';

export class SymbolMapper {
  static toResponse(entity: any) {
    const companyProvider = entity.companyProviderId;

    return {
      id: String(entity._id ?? entity.id),

      companyProviderId: String(
        companyProvider?._id ?? companyProvider?.id ?? entity.companyProviderId,
      ),

      symbol: entity.symbol,
      isActive: entity.isActive,

      companyProvider:
        companyProvider && typeof companyProvider === 'object'
          ? {
              id: String(companyProvider._id ?? companyProvider.id),
              companyName: companyProvider.companyName,
              status: companyProvider.status,
              isVerified: companyProvider.isVerified,
              isActive: companyProvider.isActive,
            }
          : undefined,

      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
  }

  static toResponseList(items: SymbolDocument[] | any[]) {
    return (items ?? []).map((item) => this.toResponse(item));
  }
}
