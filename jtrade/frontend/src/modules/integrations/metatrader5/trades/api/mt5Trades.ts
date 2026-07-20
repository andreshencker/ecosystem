import {api} from "@/app/lib/http";
import type {CreateTradePayload, Trade, UserAccountOption} from "@/trades/types/trades";

const BASE = "/mt5/trades";

// 👇 saca el array real sin importar si viene envuelto o plano
function unwrapArray<T>(respData: any): T[] {
    // caso plano: [ ... ]
    if (Array.isArray(respData)) return respData as T[];

    // caso: { data: [ ... ] }
    if (Array.isArray(respData?.data)) return respData.data as T[];

    // caso: { status:'success', data: { data: [ ... ] } }
    if (Array.isArray(respData?.data?.data)) return respData.data.data as T[];

    return [];
}

function unwrapObject<T>(respData: any): T | null {
    if (!respData) return null;
    if (respData?.data?.data) return respData.data.data as T;
    if (respData?.data) return respData.data as T;
    return respData as T;
}

// CREATE
export async function createTrade(payload: CreateTradePayload): Promise<Trade> {
    const res = await api.post(BASE, payload);
    return (unwrapObject<Trade>(res.data) ?? res.data) as Trade;
}

/**
 * ✅ GET TRADES by "userPlatformId" (linkId) usando el endpoint que YA TIENES:
 * GET /mt5/trades/user/:userId  (pero aquí userId === userPlatformId)
 */
export async function getTradesByUserPlatform(userPlatformId: string): Promise<Trade[]> {
    const res = await api.get(`${BASE}/user/${userPlatformId}`);
    return unwrapArray<Trade>(res.data);
}

/**
 * GET /mt5/trades/user/:userId/symbol/:symbol
 */
export async function getTradesByUserPlatformAndSymbol(
    userPlatformId: string,
    symbol: string,
): Promise<Trade[]> {
    const res = await api.get(`${BASE}/user/${userPlatformId}/symbol/${encodeURIComponent(symbol)}`);
    return unwrapArray<Trade>(res.data);
}

/**
 * GET /mt5/trades/user/:userId/accounts
 */
export async function getAccountsByUserPlatform(
    userPlatformId: string,
): Promise<UserAccountOption[]> {
    const res = await api.get(`${BASE}/user/${userPlatformId}/accounts`);
    return unwrapArray<UserAccountOption>(res.data);
}

export async function getTradeById(id: string): Promise<Trade | null> {
    const res = await api.get(`${BASE}/${id}`);
    return unwrapObject<Trade>(res.data);
}