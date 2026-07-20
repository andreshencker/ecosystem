import { api } from "@/app/lib/http";

import type {
    CreateIndicatorProjectDto,
    IndicatorProject,
    ListIndicatorProjectsParams,
    UpdateIndicatorProjectDto,
} from "../types/indicatorProjects";

function unwrap<T>(resp: any): T {
    return (resp?.data?.data ?? resp?.data) as T;
}

function normalize(item: any): IndicatorProject {
    return {
        ...item,

        id: item.id ?? item._id,

        companyProviderId:
            item.companyProviderId?.id ??
            item.companyProviderId?._id ??
            item.companyProviderId ??
            "",

        projectCodePlatformId:
            item.projectCodePlatformId?.id ??
            item.projectCodePlatformId?._id ??
            item.projectCodePlatformId ??
            "",

        indicatorId:
            item.indicatorId?.id ??
            item.indicatorId?._id ??
            item.indicatorId ??
            "",
    };
}

// ======================================================
// ADMIN
// ======================================================

export async function listIndicatorProjects(
    params?: ListIndicatorProjectsParams,
): Promise<IndicatorProject[]> {
    const query: Record<string, any> = {
        _t: Date.now(),
    };

    if (params?.companyProviderId) {
        query.companyProviderId = params.companyProviderId;
    }

    if (params?.projectCodePlatformId) {
        query.projectCodePlatformId = params.projectCodePlatformId;
    }

    if (params?.indicatorId) {
        query.indicatorId = params.indicatorId;
    }

    if (typeof params?.isActive === "boolean") {
        query.isActive = String(params.isActive);
    }

    const resp = await api.get("/indicator-projects", {
        params: query,
    });

    const raw = unwrap<IndicatorProject[] | any[]>(resp) ?? [];

    return raw.map(normalize);
}

export async function getIndicatorProjectById(
    id: string,
): Promise<IndicatorProject> {
    const resp = await api.get(
        `/indicator-projects/${encodeURIComponent(id)}`,
        {
            params: {
                _t: Date.now(),
            },
        },
    );

    return normalize(unwrap<IndicatorProject>(resp));
}

export async function deactivateIndicatorProject(
    id: string,
): Promise<{ deactivated: boolean }> {
    const resp = await api.delete(
        `/indicator-projects/${encodeURIComponent(id)}`,
    );

    return unwrap<{ deactivated: boolean }>(resp);
}

// ======================================================
// PROVIDER
// ======================================================

export async function listMyIndicatorProjects(): Promise<IndicatorProject[]> {
    const resp = await api.get("/indicator-projects/my", {
        params: {
            _t: Date.now(),
        },
    });

    const raw = unwrap<IndicatorProject[] | any[]>(resp) ?? [];

    return raw.map(normalize);
}

export async function getMyIndicatorProjectById(
    id: string,
): Promise<IndicatorProject> {
    const resp = await api.get(
        `/indicator-projects/my/${encodeURIComponent(id)}`,
        {
            params: {
                _t: Date.now(),
            },
        },
    );

    return normalize(unwrap<IndicatorProject>(resp));
}

export async function createMyIndicatorProject(
    dto: CreateIndicatorProjectDto,
): Promise<IndicatorProject> {
    const resp = await api.post("/indicator-projects/my", dto);

    return normalize(unwrap<IndicatorProject>(resp));
}

export async function updateMyIndicatorProject(
    id: string,
    dto: UpdateIndicatorProjectDto,
): Promise<IndicatorProject> {
    const resp = await api.patch(
        `/indicator-projects/my/${encodeURIComponent(id)}`,
        dto,
    );

    return normalize(unwrap<IndicatorProject>(resp));
}

export async function removeMyIndicatorProject(
    id: string,
): Promise<{ deleted: boolean }> {
    const resp = await api.delete(
        `/indicator-projects/my/${encodeURIComponent(id)}`,
    );

    return unwrap<{ deleted: boolean }>(resp);
}

// ======================================================
// CLIENT
// ======================================================

export async function listAvailableIndicatorProjects(): Promise<
    IndicatorProject[]
> {
    const resp = await api.get("/indicator-projects/available", {
        params: {
            _t: Date.now(),
        },
    });

    const raw = unwrap<IndicatorProject[] | any[]>(resp) ?? [];

    return raw.map(normalize);
}