import { api } from "@/app/lib/http";

import type {
    CodeProjectVersion,
    CreateCodeProjectVersionPayload,
    CurrentVersionDownload,
    DownloadCurrentVersionPayload,
    ListCodeProjectVersionsParams,
    ReplaceCodeProjectVersionFilePayload,
    UpdateCodeProjectVersionPayload,
    VersionDownload,
} from "../types/codeProjectVersions";

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

const BASE = "/code-project-versions";

export async function listCodeProjectVersions(
    params?: ListCodeProjectVersionsParams,
): Promise<CodeProjectVersion[]> {
    const query: Record<string, any> = {};

    if (params?.projectCodePlatformId) {
        query.projectCodePlatformId = params.projectCodePlatformId;
    }

    if (params?.codeProjectId) {
        query.codeProjectId = params.codeProjectId;
    }

    if (params?.companyProviderId) {
        query.companyProviderId = params.companyProviderId;
    }

    if (params?.platformId) {
        query.platformId = params.platformId;
    }

    if (typeof params?.active === "boolean") {
        query.active = String(params.active);
    }

    if (typeof params?.current === "boolean") {
        query.current = String(params.current);
    }

    if (typeof params?.populate === "boolean") {
        query.populate = String(params.populate);
    }

    const { data } = await api.get<
        Envelope<CodeProjectVersion[]> | CodeProjectVersion[]
    >(BASE, {
        params: Object.keys(query).length ? query : undefined,
    });

    return unwrap<CodeProjectVersion[]>(data) ?? [];
}

export async function listMyCodeProjectVersions(
    params?: ListCodeProjectVersionsParams,
): Promise<CodeProjectVersion[]> {
    const query: Record<string, any> = {};

    if (params?.projectCodePlatformId) {
        query.projectCodePlatformId = params.projectCodePlatformId;
    }

    if (params?.codeProjectId) {
        query.codeProjectId = params.codeProjectId;
    }

    if (params?.platformId) {
        query.platformId = params.platformId;
    }

    if (typeof params?.active === "boolean") {
        query.active = String(params.active);
    }

    if (typeof params?.current === "boolean") {
        query.current = String(params.current);
    }

    const { data } = await api.get<
        Envelope<CodeProjectVersion[]> | CodeProjectVersion[]
    >(`${BASE}/my`, {
        params: Object.keys(query).length ? query : undefined,
    });

    return unwrap<CodeProjectVersion[]>(data) ?? [];
}

export async function getCodeProjectVersionById(
    id: string,
    populate = true,
): Promise<CodeProjectVersion> {
    const { data } = await api.get<
        Envelope<CodeProjectVersion> | CodeProjectVersion
    >(`${BASE}/${encodeURIComponent(id)}`, {
        params: { populate: String(populate) },
    });

    return unwrap<CodeProjectVersion>(data);
}

export async function getMyCodeProjectVersionById(
    id: string,
): Promise<CodeProjectVersion> {
    const { data } = await api.get<
        Envelope<CodeProjectVersion> | CodeProjectVersion
    >(`${BASE}/my/${encodeURIComponent(id)}`);

    return unwrap<CodeProjectVersion>(data);
}

export async function uploadMyCodeProjectVersion(
    file: File,
    payload: CreateCodeProjectVersionPayload,
): Promise<CodeProjectVersion> {
    const form = new FormData();

    form.append("file", file);
    form.append("projectCodePlatformId", payload.projectCodePlatformId);
    form.append("version", payload.version);

    if (payload.comments !== undefined) {
        form.append("comments", payload.comments);
    }

    if (payload.isCurrentVersion !== undefined) {
        form.append("isCurrentVersion", String(payload.isCurrentVersion));
    }

    if (payload.isActive !== undefined) {
        form.append("isActive", String(payload.isActive));
    }

    const { data } = await api.post<
        Envelope<CodeProjectVersion> | CodeProjectVersion
    >(`${BASE}/my/upload`, form, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return unwrap<CodeProjectVersion>(data);
}

export async function replaceMyCodeProjectVersionFile(
    id: string,
    file: File,
    payload: ReplaceCodeProjectVersionFilePayload,
): Promise<CodeProjectVersion> {
    const form = new FormData();

    form.append("file", file);

    if (payload.projectCodePlatformId !== undefined) {
        form.append("projectCodePlatformId", payload.projectCodePlatformId);
    }

    if (payload.version !== undefined) {
        form.append("version", payload.version);
    }

    if (payload.comments !== undefined) {
        form.append("comments", payload.comments);
    }

    if (payload.isCurrentVersion !== undefined) {
        form.append("isCurrentVersion", String(payload.isCurrentVersion));
    }

    if (payload.isActive !== undefined) {
        form.append("isActive", String(payload.isActive));
    }

    const { data } = await api.put<
        Envelope<CodeProjectVersion> | CodeProjectVersion
    >(`${BASE}/my/${encodeURIComponent(id)}/file`, form, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });

    return unwrap<CodeProjectVersion>(data);
}

export async function updateMyCodeProjectVersion(
    id: string,
    payload: UpdateCodeProjectVersionPayload,
): Promise<CodeProjectVersion> {
    const { data } = await api.patch<
        Envelope<CodeProjectVersion> | CodeProjectVersion
    >(`${BASE}/my/${encodeURIComponent(id)}`, payload);

    return unwrap<CodeProjectVersion>(data);
}

export async function removeMyCodeProjectVersion(
    id: string,
): Promise<{ deleted: boolean }> {
    const { data } = await api.delete<
        Envelope<{ deleted: boolean }> | { deleted: boolean }
    >(`${BASE}/my/${encodeURIComponent(id)}`);

    return unwrap<{ deleted: boolean }>(data);
}

export async function removeCodeProjectVersion(
    id: string,
): Promise<{ deleted: boolean }> {
    const { data } = await api.delete<
        Envelope<{ deleted: boolean }> | { deleted: boolean }
    >(`${BASE}/${encodeURIComponent(id)}`);

    return unwrap<{ deleted: boolean }>(data);
}

export async function downloadCurrentCodeProjectVersion(
    projectCodePlatformId: string,
    params?: DownloadCurrentVersionPayload,
): Promise<CurrentVersionDownload> {
    const query: Record<string, any> = {};

    if (typeof params?.expiresInSeconds === "number") {
        query.expiresInSeconds = String(params.expiresInSeconds);
    }

    const { data } = await api.get<
        Envelope<CurrentVersionDownload> | CurrentVersionDownload
    >(`${BASE}/download/current/${encodeURIComponent(projectCodePlatformId)}`, {
        params: Object.keys(query).length ? query : undefined,
    });

    return unwrap<CurrentVersionDownload>(data);
}

export async function downloadCodeProjectVersionById(
    id: string,
    params?: DownloadCurrentVersionPayload,
): Promise<VersionDownload> {
    const query: Record<string, any> = {};

    if (typeof params?.expiresInSeconds === "number") {
        query.expiresInSeconds = String(params.expiresInSeconds);
    }

    const { data } = await api.get<Envelope<VersionDownload> | VersionDownload>(
        `${BASE}/${encodeURIComponent(id)}/download`,
        {
            params: Object.keys(query).length ? query : undefined,
        },
    );

    return unwrap<VersionDownload>(data);
}