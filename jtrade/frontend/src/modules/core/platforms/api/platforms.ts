// src/modules/platforms/api/platforms.ts
import { api } from "@/app/lib/http";
import type {
    CreatePlatformPayload,
    ListPlatformsParams,
    Platform,
    UpdatePlatformPayload,
} from "@/modules/core/platforms/types/platforms";

const BASE = "/platforms";

type Envelope<T> = {
    status: string;
    data: T;
};

export async function listPlatforms(
    params?: ListPlatformsParams
): Promise<Platform[]> {
    const { data } = await api.get<Envelope<Platform[]>>(BASE, {
        params:
            typeof params?.supported === "boolean"
                ? { supported: params.supported }
                : undefined,
    });

    return Array.isArray(data?.data) ? data.data : [];
}

export async function getPlatformById(id: string): Promise<Platform> {
    const { data } = await api.get<Envelope<Platform>>(`${BASE}/${id}`);
    return data.data;
}

export async function createPlatform(
    payload: CreatePlatformPayload
): Promise<Platform> {
    const { data } = await api.post<Envelope<Platform>>(BASE, payload);
    return data.data;
}

export async function updatePlatform(
    id: string,
    payload: UpdatePlatformPayload
): Promise<Platform> {
    const { data } = await api.patch<Envelope<Platform>>(`${BASE}/${id}`, payload);
    return data.data;
}

export async function deletePlatform(id: string): Promise<{ deleted: boolean }> {
    // este endpoint devuelve { deleted: true } sin envelope (según tu backend)
    const { data } = await api.delete<{ deleted: boolean }>(`${BASE}/${id}`);
    return data;
}