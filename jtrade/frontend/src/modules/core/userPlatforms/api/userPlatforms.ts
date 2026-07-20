// src/modules/user-platforms/api/userPlatforms.api.ts
import { api } from "@/app/lib/http";
import type {
    AdminCreateUserPlatformPayload,
    AdminUpdateUserPlatformPayload,
    ChangeMyUserPlatformStatusPayload,
    CreateMyUserPlatformPayload,
    ListAllUserPlatformsParams,
    UpdateMyUserPlatformPayload,
    UserPlatform,
} from "@/modules/core/userPlatforms/types/userPlatforms";

type Envelope<T> = { status?: string; data?: T };

// tu backend devuelve {status:"success", data: ...} (según tus screenshots)
function unwrap<T>(raw: any): T {
    if (raw && typeof raw === "object" && "data" in raw) return raw.data as T;
    return raw as T;
}

const BASE = "/user-platforms";

// ======================
// CLIENT / ME
// ======================
export async function listMyUserPlatforms(): Promise<UserPlatform[]> {
    const { data } = await api.get<Envelope<UserPlatform[]> | UserPlatform[]>(BASE);
    return unwrap<UserPlatform[]>(data) ?? [];
}

export async function createMyUserPlatform(payload: CreateMyUserPlatformPayload): Promise<UserPlatform> {
    const { data } = await api.post<Envelope<UserPlatform> | UserPlatform>(BASE, payload);
    return unwrap<UserPlatform>(data);
}

export async function getMyUserPlatformById(id: string): Promise<UserPlatform> {
    const { data } = await api.get<Envelope<UserPlatform> | UserPlatform>(`${BASE}/${id}`);
    return unwrap<UserPlatform>(data);
}

export async function setDefaultMyUserPlatform(id: string): Promise<UserPlatform> {
    const { data } = await api.patch<Envelope<UserPlatform> | UserPlatform>(`${BASE}/${id}/default`);
    return unwrap<UserPlatform>(data);
}

export async function changeMyUserPlatformStatus(
    id: string,
    payload: ChangeMyUserPlatformStatusPayload
): Promise<UserPlatform> {
    const { data } = await api.patch<Envelope<UserPlatform> | UserPlatform>(`${BASE}/${id}/status`, payload);
    return unwrap<UserPlatform>(data);
}

export async function updateMyUserPlatform(id: string, payload: UpdateMyUserPlatformPayload): Promise<UserPlatform> {
    const { data } = await api.patch<Envelope<UserPlatform> | UserPlatform>(`${BASE}/${id}`, payload);
    return unwrap<UserPlatform>(data);
}

export async function removeMyUserPlatform(id: string): Promise<{ deleted: boolean }> {
    const { data } = await api.delete<{ deleted: boolean }>(`${BASE}/${id}`);
    return data;
}

// ======================
// ADMIN (GLOBAL)
// ======================
export async function listAllUserPlatforms(params?: ListAllUserPlatformsParams): Promise<UserPlatform[]> {
    const query: Record<string, any> = {};
    if (params?.userId) query.userId = params.userId;
    if (params?.platformId) query.platformId = params.platformId;
    if (params?.status) query.status = params.status;
    if (typeof params?.isDefault === "boolean") query.isDefault = String(params.isDefault);
    if (typeof params?.isActive === "boolean") query.isActive = String(params.isActive);

    const { data } = await api.get<Envelope<UserPlatform[]> | UserPlatform[]>(`${BASE}/admin/all`, {
        params: Object.keys(query).length ? query : undefined,
    });

    return unwrap<UserPlatform[]>(data) ?? [];
}

export async function adminCreateUserPlatform(payload: AdminCreateUserPlatformPayload): Promise<UserPlatform> {
    const { data } = await api.post<Envelope<UserPlatform> | UserPlatform>(`${BASE}/admin`, payload);
    return unwrap<UserPlatform>(data);
}

export async function adminUpdateUserPlatform(id: string, payload: AdminUpdateUserPlatformPayload): Promise<UserPlatform> {
    const { data } = await api.patch<Envelope<UserPlatform> | UserPlatform>(`${BASE}/admin/${id}`, payload);
    return unwrap<UserPlatform>(data);
}