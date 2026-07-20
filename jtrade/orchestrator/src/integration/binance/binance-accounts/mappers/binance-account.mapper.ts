// src/integrations/binance/binance-accounts/mappers/binance-account.mapper.ts

export interface BinanceAccountView {
  id: string;
  userPlatformId: string;
  description: string;
  isActive: boolean;
  isDefault: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  // opcional: apiKeyMasked?: string;
}

export class BinanceAccountMapper {
  static toView(doc: any): BinanceAccountView {
    const o = typeof doc?.toObject === 'function' ? doc.toObject() : { ...doc };

    return {
      id: o._id?.toString(),
      userPlatformId: o.userPlatformId,
      description: o.description ?? '',
      isActive: o.isActive ?? true,
      isDefault: o.isDefault ?? false,
      createdAt: o.createdAt,
      updatedAt: o.updatedAt,
      // apiKeyMasked: o.apiKey ? mask(o.apiKey) : undefined,
    };
  }

  static toViewList(docs: any[]): BinanceAccountView[] {
    return docs.map((d) => this.toView(d));
  }
}
