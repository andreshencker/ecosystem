import { api } from "@/app/lib/http";

import type {
    CreateUserAccountInfoDto,
    IndicatorProjectLite,
    ProjectCodePlatformLite,
    UpdateUserAccountInfoDto,
    UserAccountInfo,
    UserProjectPlatformLite,
} from "../types/userAccountInfo";

function unwrap<T>(resp: any): T {
    return (resp?.data?.data ?? resp?.data) as T;
}

function normalizeProjectCodePlatform(raw: any): ProjectCodePlatformLite | null {
    if (!raw || typeof raw !== "object") return null;

    const codeProject = raw.codeProject ?? raw.codeProjectId;
    const platform = raw.platform ?? raw.platformId;

    return {
        ...raw,
        id: raw.id ?? raw._id,
        codeProject:
            codeProject && typeof codeProject === "object"
                ? { ...codeProject, id: codeProject.id ?? codeProject._id }
                : null,
        platform:
            platform && typeof platform === "object"
                ? { ...platform, id: platform.id ?? platform._id }
                : null,
    };
}

function normalizeUserProjectPlatform(raw: any): UserProjectPlatformLite | null {
    if (!raw || typeof raw !== "object") return null;

    const projectCodePlatform =
        raw.projectCodePlatform ?? raw.projectCodePlatformId;

    return {
        ...raw,
        id: raw.id ?? raw._id,
        projectCodePlatformId:
            raw.projectCodePlatformId?.id ??
            raw.projectCodePlatformId?._id ??
            raw.projectCodePlatformId ??
            projectCodePlatform?.id ??
            projectCodePlatform?._id ??
            "",
        projectCodePlatform: normalizeProjectCodePlatform(projectCodePlatform),
    };
}

function normalizeIndicatorProject(raw: any): IndicatorProjectLite | null {
    if (!raw || typeof raw !== "object") return null;

    const indicator = raw.indicator ?? raw.indicatorId;
    const companyProvider = raw.companyProvider ?? raw.companyProviderId;
    const projectCodePlatform =
        raw.projectCodePlatform ?? raw.projectCodePlatformId;

    return {
        ...raw,
        id: raw.id ?? raw._id,
        indicatorId:
            raw.indicatorId?.id ??
            raw.indicatorId?._id ??
            raw.indicatorId ??
            indicator?.id ??
            indicator?._id ??
            "",
        companyProviderId:
            raw.companyProviderId?.id ??
            raw.companyProviderId?._id ??
            raw.companyProviderId ??
            companyProvider?.id ??
            companyProvider?._id ??
            "",
        projectCodePlatformId:
            raw.projectCodePlatformId?.id ??
            raw.projectCodePlatformId?._id ??
            raw.projectCodePlatformId ??
            projectCodePlatform?.id ??
            projectCodePlatform?._id ??
            "",
        indicator:
            indicator && typeof indicator === "object"
                ? { ...indicator, id: indicator.id ?? indicator._id }
                : null,
        companyProvider:
            companyProvider && typeof companyProvider === "object"
                ? { ...companyProvider, id: companyProvider.id ?? companyProvider._id }
                : null,
        projectCodePlatform: normalizeProjectCodePlatform(projectCodePlatform),
    };
}

function normalize(doc: any): UserAccountInfo {
    const userProjectPlatform = normalizeUserProjectPlatform(
        doc.userProjectPlatform ?? doc.userProjectPlatformId,
    );

    const indicatorProject = normalizeIndicatorProject(
        doc.indicatorProject ?? doc.indicatorProjectId,
    );

    return {
        ...doc,
        id: doc.id ?? doc._id,
        userProjectPlatformId:
            doc.userProjectPlatformId?.id ??
            doc.userProjectPlatformId?._id ??
            doc.userProjectPlatformId ??
            userProjectPlatform?.id ??
            "",
        indicatorProjectId:
            doc.indicatorProjectId?.id ??
            doc.indicatorProjectId?._id ??
            doc.indicatorProjectId ??
            indicatorProject?.id ??
            "",
        accountRef: doc.accountRef ?? null,
        accountLabel: doc.accountLabel ?? null,
        canTrade: !!doc.canTrade,
        isActive: doc.isActive !== false,
        userProjectPlatform,
        indicatorProject,
    };
}

export async function listMyUserAccountInfos(): Promise<UserAccountInfo[]> {
    const resp = await api.get("/user-account-info");
    const rows = unwrap<any[]>(resp) ?? [];

    return rows.map(normalize);
}

export async function getMyUserAccountInfo(
    id: string,
): Promise<UserAccountInfo> {
    const resp = await api.get(`/user-account-info/${encodeURIComponent(id)}`);

    return normalize(unwrap<any>(resp));
}

export async function createMyUserAccountInfo(
    dto: CreateUserAccountInfoDto,
): Promise<UserAccountInfo> {
    const resp = await api.post("/user-account-info", dto);

    return normalize(unwrap<any>(resp));
}

export async function updateMyUserAccountInfo(
    id: string,
    dto: UpdateUserAccountInfoDto,
): Promise<UserAccountInfo> {
    const resp = await api.patch(
        `/user-account-info/${encodeURIComponent(id)}`,
        dto,
    );

    return normalize(unwrap<any>(resp));
}

export async function deleteMyUserAccountInfo(
    id: string,
): Promise<{ deleted: boolean; deletedSymbolExecutions?: number }> {
    const resp = await api.delete(`/user-account-info/${encodeURIComponent(id)}`);

    return unwrap(resp);
}