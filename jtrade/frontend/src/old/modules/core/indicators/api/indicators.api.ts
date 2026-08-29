import { api } from "@/lib/http";

import type {
    CreateIndicatorDto,
    Indicator,
    IndicatorResponseDto,
    ListIndicatorsParams,
    UpdateIndicatorDto,
} from "../types/indicators";

function unwrap<T>(resp: any): T {
    return (resp?.data?.data ?? resp?.data) as T;
}

function normalize(ind: any): Indicator {
    return {
        ...ind,
        id: ind.id ?? ind._id,
        companyProviderId:
            ind.companyProviderId?.id ??
            ind.companyProviderId?._id ??
            ind.companyProviderId ??
            "",
    };
}

export async function listIndicators(
    params?: ListIndicatorsParams,
): Promise<Indicator[]> {
    const query: Record<string, any> = {
        _t: Date.now(),
    };

    if (params?.companyProviderId) {
        query.companyProviderId = params.companyProviderId;
    }

    if (typeof params?.isActive === "boolean") {
        query.isActive = String(params.isActive);
    }

    const resp = await api.get("/indicators", {
        params: query,
    });

    const raw = unwrap<IndicatorResponseDto[] | any[]>(resp) ?? [];

    return raw.map(normalize);
}

export async function getIndicatorById(id: string): Promise<Indicator> {
    const resp = await api.get(`/indicators/${encodeURIComponent(id)}`, {
        params: {
            _t: Date.now(),
        },
    });

    const raw = unwrap<IndicatorResponseDto>(resp);

    return normalize(raw);
}

export async function createIndicator(
    dto: CreateIndicatorDto,
): Promise<Indicator> {
    const resp = await api.post("/indicators", dto);
    const raw = unwrap<IndicatorResponseDto>(resp);

    return normalize(raw);
}

export async function updateIndicator(
    id: string,
    dto: UpdateIndicatorDto,
): Promise<Indicator> {
    const resp = await api.patch(`/indicators/${encodeURIComponent(id)}`, dto);
    const raw = unwrap<IndicatorResponseDto>(resp);

    return normalize(raw);
}

export async function deleteIndicator(
    id: string,
): Promise<{ deleted: boolean }> {
    const resp = await api.delete(`/indicators/${encodeURIComponent(id)}`);

    return unwrap<{ deleted: boolean }>(resp);
}