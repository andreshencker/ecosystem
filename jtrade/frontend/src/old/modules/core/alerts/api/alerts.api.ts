import { api } from "@/lib/http";

import type {
    Alert,
    AlertGroupRow,
    CreateAlertDto,
    QueryAlerts,
    QueryAlertGroups,
    UpdateAlertDto,
} from "../types/alerts";

function unwrap<T>(resp: any): T {
    return (resp?.data?.data ?? resp?.data) as T;
}

function normalizeSymbolData(raw: any) {
    const symbolData = raw?.symbolData ?? raw?.symbolId;

    if (!symbolData || typeof symbolData !== "object") {
        return null;
    }

    return {
        id: symbolData.id ?? symbolData._id,
        symbol: symbolData.symbol,
        isActive: symbolData.isActive,
        companyProviderId:
            symbolData.companyProviderId?.id ??
            symbolData.companyProviderId?._id ??
            symbolData.companyProviderId,
    };
}

function normalizeIndicatorProject(raw: any) {
    const indicatorProject = raw?.indicatorProject ?? raw?.indicatorProjectId;

    if (!indicatorProject || typeof indicatorProject !== "object") {
        return null;
    }

    const indicator = indicatorProject?.indicator ?? indicatorProject?.indicatorId;

    const projectCodePlatform =
        indicatorProject?.projectCodePlatform ??
        indicatorProject?.projectCodePlatformId;

    const codeProject =
        projectCodePlatform?.codeProject ?? projectCodePlatform?.codeProjectId;

    const platform = projectCodePlatform?.platform ?? projectCodePlatform?.platformId;

    return {
        id: indicatorProject.id ?? indicatorProject._id,
        isActive: indicatorProject.isActive,
        notes: indicatorProject.notes,

        indicator: indicator
            ? {
                ...indicator,
                id: indicator.id ?? indicator._id,
            }
            : undefined,

        projectCodePlatform: projectCodePlatform
            ? {
                ...projectCodePlatform,
                id: projectCodePlatform.id ?? projectCodePlatform._id,

                codeProject: codeProject
                    ? {
                        ...codeProject,
                        id: codeProject.id ?? codeProject._id,
                    }
                    : undefined,

                platform: platform
                    ? {
                        ...platform,
                        id: platform.id ?? platform._id,
                    }
                    : undefined,
            }
            : undefined,
    };
}

function normalizeAlert(a: any): Alert {
    const indicatorProject = normalizeIndicatorProject(a);
    const symbolData = normalizeSymbolData(a);

    return {
        ...a,

        id: a.id ?? a._id,

        indicatorProjectId:
            a.indicatorProjectId?.id ??
            a.indicatorProjectId?._id ??
            a.indicatorProjectId ??
            indicatorProject?.id ??
            "",

        symbolId:
            a.symbolId?.id ??
            a.symbolId?._id ??
            a.symbolId ??
            symbolData?.id ??
            "",

        symbol: a.symbol ?? symbolData?.symbol ?? "",
        timeFrame: a.timeFrame ?? a.timeframe ?? a.time_frame,
        groupId: a.groupId ?? a.group_id,
        action: a.action,
        isActive: !!a.isActive,

        symbolData,
        indicatorProject,
    };
}

function normalizeGroupRow(r: any): AlertGroupRow {
    const indicatorProject = normalizeIndicatorProject(r);
    const symbolData = normalizeSymbolData(r);

    return {
        groupId: r.groupId,

        indicatorProjectId:
            r.indicatorProjectId?.id ??
            r.indicatorProjectId?._id ??
            r.indicatorProjectId ??
            indicatorProject?.id ??
            "",

        symbolId:
            r.symbolId?.id ??
            r.symbolId?._id ??
            r.symbolId ??
            symbolData?.id ??
            "",

        symbol: r.symbol ?? symbolData?.symbol ?? "",
        timeFrame: r.timeFrame ?? r.timeframe,

        isActive: !!r.isActive,

        actions: Array.isArray(r.actions) ? r.actions : [],

        symbolData,
        indicatorProject,

        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}

export async function listAlerts(query?: QueryAlerts): Promise<Alert[]> {
    const params: any = {};

    if (query?.indicatorProjectId) params.indicatorProjectId = query.indicatorProjectId;
    if (query?.symbolId) params.symbolId = query.symbolId;
    if (query?.symbol) params.symbol = query.symbol;
    if (query?.timeframe) params.timeFrame = query.timeframe;
    if (query?.groupId) params.groupId = query.groupId;
    if (query?.action) params.action = query.action;
    if (typeof query?.isActive === "boolean") params.isActive = String(query.isActive);

    const resp = await api.get("/alerts", { params });
    const data = unwrap<any[]>(resp) ?? [];

    return data.map(normalizeAlert);
}

export async function getAlertById(id: string): Promise<Alert> {
    const resp = await api.get(`/alerts/${encodeURIComponent(id)}`);
    return normalizeAlert(unwrap<any>(resp));
}

export async function createAlert(dto: CreateAlertDto): Promise<Alert[]> {
    const resp = await api.post("/alerts", dto);
    const list = unwrap<any[]>(resp) ?? [];

    return list.map(normalizeAlert);
}

export async function updateAlert(
    id: string,
    dto: UpdateAlertDto,
): Promise<Alert[]> {
    const resp = await api.patch(`/alerts/${encodeURIComponent(id)}`, dto);
    const list = unwrap<any[]>(resp) ?? [];

    return list.map(normalizeAlert);
}

export async function deleteAlert(id: string): Promise<{ deleted: boolean }> {
    const resp = await api.delete(`/alerts/${encodeURIComponent(id)}`);
    return unwrap<{ deleted: boolean }>(resp);
}

export async function listAlertGroups(
    query?: QueryAlertGroups,
): Promise<AlertGroupRow[]> {
    const params: any = {};

    if (query?.indicatorProjectId) params.indicatorProjectId = query.indicatorProjectId;
    if (query?.symbolId) params.symbolId = query.symbolId;
    if (query?.symbol) params.symbol = query.symbol;
    if (query?.timeframe) params.timeFrame = query.timeframe;
    if (typeof query?.isActive === "boolean") params.isActive = String(query.isActive);

    const resp = await api.get("/alerts/groups", { params });
    const rows = unwrap<any[]>(resp) ?? [];

    return rows.map(normalizeGroupRow);
}