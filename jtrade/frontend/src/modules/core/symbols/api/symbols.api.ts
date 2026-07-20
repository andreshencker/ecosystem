import { api } from "@/app/lib/http";

import type {
    BulkCreateSymbolDto,
    CreateSymbolDto,
    ListSymbolsParams,
    SymbolItem,
    UpdateSymbolDto,
} from "../types/symbols";

function unwrap<T>(resp: any): T {
    return (resp?.data?.data ?? resp?.data) as T;
}

function normalizeSymbol(raw: any): SymbolItem {
    const companyProvider = raw?.companyProvider ?? raw?.companyProviderId;

    return {
        ...raw,
        id: raw?.id ?? raw?._id,

        companyProviderId:
            raw?.companyProviderId?.id ??
            raw?.companyProviderId?._id ??
            raw?.companyProviderId ??
            companyProvider?.id ??
            companyProvider?._id ??
            "",

        symbol: raw?.symbol ?? "",
        isActive: raw?.isActive !== false,

        companyProvider:
            companyProvider && typeof companyProvider === "object"
                ? {
                    id: companyProvider.id ?? companyProvider._id,
                    companyName: companyProvider.companyName,
                    status: companyProvider.status,
                    isVerified: companyProvider.isVerified,
                    isActive: companyProvider.isActive,
                }
                : undefined,
    };
}

const BASE = "/symbols";

export async function listSymbols(
    params?: ListSymbolsParams,
): Promise<SymbolItem[]> {
    const query: Record<string, any> = {
        _t: Date.now(),
    };

    if (params?.companyProviderId) {
        query.companyProviderId = params.companyProviderId;
    }

    const endpoint = params?.isActive === true ? `${BASE}/active` : BASE;

    const resp = await api.get(endpoint, {
        params: query,
    });

    const raw = unwrap<any[]>(resp) ?? [];

    return raw.map(normalizeSymbol);
}

export async function createSymbol(
    dto: CreateSymbolDto,
): Promise<SymbolItem> {
    const resp = await api.post(BASE, {
        ...dto,
        symbol: dto.symbol.trim().toUpperCase(),
    });

    return normalizeSymbol(unwrap<any>(resp));
}

export async function bulkCreateSymbols(
    dto: BulkCreateSymbolDto,
): Promise<{
    message: string;
    total: number;
    items: SymbolItem[];
}> {
    const resp = await api.post(`${BASE}/bulk`, {
        companyProviderId: dto.companyProviderId,
        items: dto.items.map((item) => ({
            symbol: item.symbol.trim().toUpperCase(),
            isActive: item.isActive ?? true,
        })),
    });

    const raw = unwrap<any>(resp);

    return {
        message: raw?.message ?? "Symbols created successfully",
        total: raw?.total ?? 0,
        items: Array.isArray(raw?.items)
            ? raw.items.map(normalizeSymbol)
            : [],
    };
}

export async function updateSymbol(
    id: string,
    dto: UpdateSymbolDto,
): Promise<SymbolItem> {
    const payload = {
        ...dto,
        symbol: dto.symbol ? dto.symbol.trim().toUpperCase() : undefined,
    };

    const resp = await api.patch(
        `${BASE}/${encodeURIComponent(id)}`,
        payload,
    );

    return normalizeSymbol(unwrap<any>(resp));
}

export async function updateSymbolStatus(
    id: string,
    isActive: boolean,
): Promise<SymbolItem> {
    const resp = await api.patch(
        `${BASE}/${encodeURIComponent(id)}/status`,
        { isActive },
    );

    return normalizeSymbol(unwrap<any>(resp));
}

export async function deleteSymbol(
    id: string,
): Promise<{ message: string; id: string; symbol: string }> {
    const resp = await api.delete(`${BASE}/${encodeURIComponent(id)}`);

    return unwrap(resp);
}