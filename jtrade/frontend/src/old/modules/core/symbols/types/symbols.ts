export type SymbolCompanyProvider = {
    id: string;
    companyName?: string;
    status?: string;
    isVerified?: boolean;
    isActive?: boolean;
};

export type SymbolItem = {
    id: string;
    companyProviderId: string;
    symbol: string;
    isActive: boolean;
    companyProvider?: SymbolCompanyProvider;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateSymbolDto = {
    companyProviderId: string;
    symbol: string;
    isActive?: boolean;
};

export type UpdateSymbolDto = Partial<{
    companyProviderId: string;
    symbol: string;
    isActive: boolean;
}>;

export type BulkCreateSymbolDto = {
    companyProviderId: string;
    items: {
        symbol: string;
        isActive?: boolean;
    }[];
};

export type ListSymbolsParams = {
    companyProviderId?: string;
    isActive?: boolean;
};

export type SymbolOption = {
    id: string;
    companyProviderId: string;
    symbol: string;
    isActive: boolean;
};