// src/modules/integrations/binance/binanceAccount/types/binanceAccounts.ts
export interface BinanceAccount {
    id: string;
    userPlatformId: string;
    description: string;
    isActive: boolean;
    isDefault: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface CreateBinanceAccountDto {
    userPlatformId: string;
    apiKey: string;
    apiSecret: string;
    description?: string;
    isActive?: boolean;
}

export interface UpdateBinanceAccountDto {
    description?: string;
    apiKey?: string;
    apiSecret?: string;
    isActive?: boolean;
}

export interface ApiWrappedResponse<T> {
    status: string;
    data: T;
}