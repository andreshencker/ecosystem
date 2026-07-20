import { api } from "@/app/lib/http";

import type {
    CreateUserProjectPlatformDto,
    ListUserProjectPlatformsParams,
    UpdateUserProjectPlatformDto,
    UserProjectPlatform,
} from "../types/userProjectPlatforms";

type Envelope<T> = {
    status?: string;
    data?: T;
};

function unwrap<T>(raw: Envelope<T> | T): T {
    if (
        raw &&
        typeof raw === "object" &&
        "data" in raw &&
        (raw as Envelope<T>).data !== undefined
    ) {
        return (raw as Envelope<T>).data as T;
    }

    return raw as T;
}

const BASE = "/user-project-platforms";

// ==========================================
// CLIENT
// ==========================================

export async function listMyUserProjectPlatforms(): Promise<UserProjectPlatform[]> {
    const { data } = await api.get<
        Envelope<UserProjectPlatform[]> | UserProjectPlatform[]
    >(`${BASE}/my`);

    return unwrap<UserProjectPlatform[]>(data) ?? [];
}

export async function createMyUserProjectPlatform(
    dto: CreateUserProjectPlatformDto,
): Promise<UserProjectPlatform> {
    const { data } = await api.post<
        Envelope<UserProjectPlatform> | UserProjectPlatform
    >(`${BASE}/my`, dto);

    return unwrap<UserProjectPlatform>(data);
}

export async function getMyUserProjectPlatformById(
    id: string,
): Promise<UserProjectPlatform> {
    const { data } = await api.get<
        Envelope<UserProjectPlatform> | UserProjectPlatform
    >(`${BASE}/my/${encodeURIComponent(id)}`);

    return unwrap<UserProjectPlatform>(data);
}

export async function updateMyUserProjectPlatform(
    id: string,
    dto: UpdateUserProjectPlatformDto,
): Promise<UserProjectPlatform> {
    const { data } = await api.patch<
        Envelope<UserProjectPlatform> | UserProjectPlatform
    >(`${BASE}/my/${encodeURIComponent(id)}`, dto);

    return unwrap<UserProjectPlatform>(data);
}

export async function removeMyUserProjectPlatform(
    id: string,
): Promise<{ deleted: boolean }> {
    const { data } = await api.delete<
        Envelope<{ deleted: boolean }> | { deleted: boolean }
    >(`${BASE}/my/${encodeURIComponent(id)}`);

    return unwrap<{ deleted: boolean }>(data);
}

export async function markMyUserProjectPlatformDownloaded(
    id: string,
): Promise<{ updated: boolean }> {
    const { data } = await api.patch<
        Envelope<{ updated: boolean }> | { updated: boolean }
    >(`${BASE}/my/${encodeURIComponent(id)}/downloaded`);

    return unwrap<{ updated: boolean }>(data);
}

// ==========================================
// ADMIN
// ==========================================

export async function listUserProjectPlatforms(
    params?: ListUserProjectPlatformsParams,
): Promise<UserProjectPlatform[]> {
    const query: Record<string, any> = {};

    if (params?.userId) {
        query.userId = params.userId;
    }

    if (params?.projectCodePlatformId) {
        query.projectCodePlatformId = params.projectCodePlatformId;
    }

    if (typeof params?.isActive === "boolean") {
        query.isActive = String(params.isActive);
    }

    const { data } = await api.get<
        Envelope<UserProjectPlatform[]> | UserProjectPlatform[]
    >(BASE, {
        params: Object.keys(query).length ? query : undefined,
    });

    return unwrap<UserProjectPlatform[]>(data) ?? [];
}

export async function adminUpdateUserProjectPlatform(
    id: string,
    dto: UpdateUserProjectPlatformDto,
): Promise<UserProjectPlatform> {
    const { data } = await api.patch<
        Envelope<UserProjectPlatform> | UserProjectPlatform
    >(`${BASE}/${encodeURIComponent(id)}`, dto);

    return unwrap<UserProjectPlatform>(data);
}

export async function adminRemoveUserProjectPlatform(
    id: string,
): Promise<{ deleted: boolean }> {
    const { data } = await api.delete<
        Envelope<{ deleted: boolean }> | { deleted: boolean }
    >(`${BASE}/${encodeURIComponent(id)}`);

    return unwrap<{ deleted: boolean }>(data);
}