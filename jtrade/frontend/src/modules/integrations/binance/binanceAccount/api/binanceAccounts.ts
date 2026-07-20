// src/modules/integrations/binance/binanceAccount/api/binanceAccounts.ts
import {AxiosResponse} from "axios";
import {api} from "@/app/lib/http";
import type {
    ApiWrappedResponse,
    BinanceAccount,
    CreateBinanceAccountDto,
    UpdateBinanceAccountDto,
} from "@/modules/integrations/binance/binanceAccount/types/binanceAccounts";

const BASE_PATH = "/client/binance/accounts";

function unwrap<T>(resp: AxiosResponse<any>): T {
    const body = resp.data;
    if (body && typeof body === "object" && "data" in body) {
        return (body as ApiWrappedResponse<T>).data;
    }
    return body as T;
}

export async function listBinanceAccounts(
    platformId?: string
): Promise<BinanceAccount[]> {
    const resp = await api.get(BASE_PATH, {
        params: platformId ? {platformId} : undefined,
    });
    return unwrap(resp);
}

export async function getBinanceAccountById(
    id: string
): Promise<BinanceAccount> {
    const resp = await api.get(`${BASE_PATH}/${id}`);
    return unwrap(resp);
}

export async function createBinanceAccount(
    dto: CreateBinanceAccountDto
): Promise<BinanceAccount> {
    const resp = await api.post(BASE_PATH, dto);
    return unwrap(resp);
}

export async function updateBinanceAccount(
    id: string,
    dto: UpdateBinanceAccountDto
): Promise<BinanceAccount> {
    const resp = await api.patch(`${BASE_PATH}/${id}`, dto);
    return unwrap(resp);
}

export async function setDefaultBinanceAccount(
    id: string
): Promise<BinanceAccount> {
    const resp = await api.patch(`${BASE_PATH}/${id}/default`);
    return unwrap(resp);
}

export async function deleteBinanceAccount(
    id: string
): Promise<{ ok: boolean }> {
    const resp = await api.delete(`${BASE_PATH}/${id}`);
    return unwrap(resp);
}