import { api } from "@/app/lib/http";

import type {
    CodeProject,
    CreateCodeProjectPayload,
    ListCodeProjectsParams,
    UpdateCodeProjectPayload,
} from "../types/codeProjects";

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

const BASE = "/code-projects";

/**
 * ADMIN FLOW
 */
export async function listCodeProjects(
    params?: ListCodeProjectsParams,
): Promise<CodeProject[]> {
    const query: Record<string, any> = {};

    if (typeof params?.active === "boolean") {
        query.active = String(params.active);
    }

    if (params?.companyProviderId) {
        query.companyProviderId = params.companyProviderId;
    }

    if (params?.typeProjectId) {
        query.typeProjectId = params.typeProjectId;
    }

    const { data } = await api.get<Envelope<CodeProject[]> | CodeProject[]>(
        BASE,
        {
            params: Object.keys(query).length ? query : undefined,
        },
    );

    return unwrap<CodeProject[]>(data) ?? [];
}

export async function getCodeProjectById(id: string): Promise<CodeProject> {
    const { data } = await api.get<Envelope<CodeProject> | CodeProject>(
        `${BASE}/${encodeURIComponent(id)}`,
    );

    return unwrap<CodeProject>(data);
}

export async function deactivateCodeProject(
    id: string,
): Promise<{ deactivated: boolean }> {
    const { data } = await api.delete<
        Envelope<{ deactivated: boolean }> | { deactivated: boolean }
    >(`${BASE}/${encodeURIComponent(id)}`);

    return unwrap<{ deactivated: boolean }>(data);
}

/**
 * PROVIDER FLOW
 */
export async function listMyCodeProjects(): Promise<CodeProject[]> {
    const { data } = await api.get<Envelope<CodeProject[]> | CodeProject[]>(
        `${BASE}/my`,
    );

    return unwrap<CodeProject[]>(data) ?? [];
}

export async function getMyCodeProjectById(id: string): Promise<CodeProject> {
    const { data } = await api.get<Envelope<CodeProject> | CodeProject>(
        `${BASE}/my/${encodeURIComponent(id)}`,
    );

    return unwrap<CodeProject>(data);
}

export async function createMyCodeProject(
    payload: CreateCodeProjectPayload,
): Promise<CodeProject> {
    const { data } = await api.post<Envelope<CodeProject> | CodeProject>(
        `${BASE}/my`,
        payload,
    );

    return unwrap<CodeProject>(data);
}

export async function updateMyCodeProject(
    id: string,
    payload: UpdateCodeProjectPayload,
): Promise<CodeProject> {
    const { data } = await api.patch<Envelope<CodeProject> | CodeProject>(
        `${BASE}/my/${encodeURIComponent(id)}`,
        payload,
    );

    return unwrap<CodeProject>(data);
}

export async function removeMyCodeProject(
    id: string,
): Promise<{ deleted: boolean }> {
    const { data } = await api.delete<
        Envelope<{ deleted: boolean }> | { deleted: boolean }
    >(`${BASE}/my/${encodeURIComponent(id)}`);

    return unwrap<{ deleted: boolean }>(data);
}