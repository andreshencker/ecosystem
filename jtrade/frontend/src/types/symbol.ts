// src/types/symbol.ts

export type SymbolItem = {
    id?: string;
    providerOrganizationId: string;
    symbol: string;
    aliases: string[];
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateSymbolPayload = {
    symbol: string;
    aliases?: string[];
    isActive?: boolean;
};

export type UpdateSymbolPayload = {
    symbol?: string;
    aliases?: string[];
    isActive?: boolean;
};

export type BulkCreateResult = {
    created: number;
    skipped: number;
    symbols: SymbolItem[];
};
