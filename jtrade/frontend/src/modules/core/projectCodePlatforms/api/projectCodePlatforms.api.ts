import { api } from "@/app/lib/http";

import type {
    CreateProjectCodePlatformPayload,
    ListProjectCodePlatformsParams,
    ProjectCodePlatform,
    UpdateProjectCodePlatformPayload,
} from "../types/projectCodePlatforms";

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

const BASE = "/project-code-platforms";

// ==========================================
// ADMIN
// ==========================================

export async function listProjectCodePlatforms(
    params?: ListProjectCodePlatformsParams,
): Promise<ProjectCodePlatform[]> {
    const query: Record<string, any> = {};

    if (typeof params?.active === "boolean") {
        query.active = String(params.active);
    }

    if (params?.codeProjectId) {
        query.codeProjectId = params.codeProjectId;
    }

    if (params?.platformId) {
        query.platformId = params.platformId;
    }

    const { data } = await api.get<
        Envelope<ProjectCodePlatform[]> | ProjectCodePlatform[]
    >(BASE, {
        params: Object.keys(query).length ? query : undefined,
    });

    return unwrap<ProjectCodePlatform[]>(data) ?? [];
}

export async function getProjectCodePlatformById(
    id: string,
): Promise<ProjectCodePlatform> {
    const { data } = await api.get<
        Envelope<ProjectCodePlatform> | ProjectCodePlatform
    >(`${BASE}/${encodeURIComponent(id)}`);

    return unwrap<ProjectCodePlatform>(data);
}

export async function deactivateProjectCodePlatform(
    id: string,
): Promise<{ deactivated: boolean }> {
    const { data } = await api.delete<
        Envelope<{ deactivated: boolean }> | { deactivated: boolean }
    >(`${BASE}/${encodeURIComponent(id)}`);

    return unwrap<{ deactivated: boolean }>(data);
}

// ==========================================
// CLIENT
// ==========================================

export async function listAvailableProjectCodePlatforms(): Promise<
    ProjectCodePlatform[]
> {
    const { data } = await api.get<
        Envelope<ProjectCodePlatform[]> | ProjectCodePlatform[]
    >(`${BASE}/available`);

    return unwrap<ProjectCodePlatform[]>(data) ?? [];
}

// ==========================================
// PROVIDER
// ==========================================

export async function listMyProjectCodePlatforms(): Promise<
    ProjectCodePlatform[]
> {
    const { data } = await api.get<
        Envelope<ProjectCodePlatform[]> | ProjectCodePlatform[]
    >(`${BASE}/my`);

    return unwrap<ProjectCodePlatform[]>(data) ?? [];
}

export async function getMyProjectCodePlatformById(
    id: string,
): Promise<ProjectCodePlatform> {
    const { data } = await api.get<
        Envelope<ProjectCodePlatform> | ProjectCodePlatform
    >(`${BASE}/my/${encodeURIComponent(id)}`);

    return unwrap<ProjectCodePlatform>(data);
}

export async function createMyProjectCodePlatform(
    payload: CreateProjectCodePlatformPayload,
): Promise<ProjectCodePlatform> {
    const { data } = await api.post<
        Envelope<ProjectCodePlatform> | ProjectCodePlatform
    >(`${BASE}/my`, payload);

    return unwrap<ProjectCodePlatform>(data);
}

export async function updateMyProjectCodePlatform(
    id: string,
    payload: UpdateProjectCodePlatformPayload,
): Promise<ProjectCodePlatform> {
    const { data } = await api.patch<
        Envelope<ProjectCodePlatform> | ProjectCodePlatform
    >(`${BASE}/my/${encodeURIComponent(id)}`, payload);

    return unwrap<ProjectCodePlatform>(data);
}

export async function removeMyProjectCodePlatform(
    id: string,
): Promise<{ deleted: boolean }> {
    const { data } = await api.delete<
        Envelope<{ deleted: boolean }> | { deleted: boolean }
    >(`${BASE}/my/${encodeURIComponent(id)}`);

    return unwrap<{ deleted: boolean }>(data);
}