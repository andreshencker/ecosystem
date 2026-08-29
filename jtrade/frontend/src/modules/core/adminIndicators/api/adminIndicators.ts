import { api } from "@/lib/http";

import type {
    AdminIndicator,
    CreateAdminIndicatorPayload,
    RevealWebhookResponse,
    RotateWebhookResponse,
    UpdateAdminIndicatorPayload,
    WebhookKeyResponse,
} from "../types/adminIndicators";

type Envelope<T> = {
    status?: string;
    data?: T;
};

function unwrap<T>(resp: any): T {
    return (resp?.data?.data ?? resp?.data) as T;
}

function normalizeAdminIndicator(raw: any): AdminIndicator {
    const indicatorProject =
        raw?.indicatorProject ??
        raw?.indicatorProjectId;

    const projectCodePlatform =
        indicatorProject?.projectCodePlatform ??
        indicatorProject?.projectCodePlatformId;

    const indicator =
        indicatorProject?.indicator ??
        indicatorProject?.indicatorId;

    const companyProvider =
        indicatorProject?.companyProvider ??
        indicatorProject?.companyProviderId;

    const codeProject =
        projectCodePlatform?.codeProject ??
        projectCodePlatform?.codeProjectId;

    const platform =
        projectCodePlatform?.platform ??
        projectCodePlatform?.platformId;

    return {
        id: raw?.id ?? raw?._id,

        indicatorProjectId:
            raw?.indicatorProjectId?.id ??
            raw?.indicatorProjectId?._id ??
            raw?.indicatorProjectId ??
            indicatorProject?.id ??
            indicatorProject?._id ??
            "",

        webhookKey: raw?.webhookKey ?? "",
        isActive: raw?.isActive !== false,

        createdAt: raw?.createdAt,
        updatedAt: raw?.updatedAt,

        indicatorProject: indicatorProject
            ? {
                id: indicatorProject?.id ?? indicatorProject?._id,
                isActive: indicatorProject?.isActive,
                notes: indicatorProject?.notes,

                indicator: indicator
                    ? {
                        id: indicator?.id ?? indicator?._id,
                        name: indicator?.name,
                        key: indicator?.key,
                        description: indicator?.description,
                        isActive: indicator?.isActive,
                    }
                    : undefined,

                projectCodePlatform: projectCodePlatform
                    ? {
                        id:
                            projectCodePlatform?.id ??
                            projectCodePlatform?._id,
                        deliveryMode: projectCodePlatform?.deliveryMode,
                        runtimeMode: projectCodePlatform?.runtimeMode,
                        status: projectCodePlatform?.status,
                        isActive: projectCodePlatform?.isActive,

                        codeProject: codeProject
                            ? {
                                id: codeProject?.id ?? codeProject?._id,
                                name: codeProject?.name,
                                projectKey: codeProject?.projectKey,
                                isActive: codeProject?.isActive,
                            }
                            : undefined,

                        platform: platform
                            ? {
                                id: platform?.id ?? platform?._id,
                                name: platform?.name,
                                category: platform?.category,
                                connectionType: platform?.connectionType,
                                imageUrl: platform?.imageUrl,
                                isActive: platform?.isActive,
                                isSupported: platform?.isSupported,
                            }
                            : undefined,
                    }
                    : undefined,

                companyProvider: companyProvider
                    ? {
                        id: companyProvider?.id ?? companyProvider?._id,
                        companyName: companyProvider?.companyName,
                        status: companyProvider?.status,
                        isVerified: companyProvider?.isVerified,
                        isActive: companyProvider?.isActive,
                    }
                    : undefined,
            }
            : undefined,
    };
}

const BASE = "/admin-indicators";

export async function listAdminIndicators(): Promise<AdminIndicator[]> {
    const resp = await api.get<Envelope<any[]> | any[]>(BASE, {
        params: {
            _t: Date.now(),
        },
    });

    const raw = unwrap<any[]>(resp) ?? [];

    return Array.isArray(raw)
        ? raw.map(normalizeAdminIndicator)
        : [];
}

export async function getAdminIndicatorById(
    id: string,
): Promise<AdminIndicator> {
    const resp = await api.get<Envelope<any> | any>(
        `${BASE}/${encodeURIComponent(id)}`,
        {
            params: {
                _t: Date.now(),
            },
        },
    );

    return normalizeAdminIndicator(unwrap<any>(resp));
}

export async function createAdminIndicator(
    payload: CreateAdminIndicatorPayload,
): Promise<AdminIndicator> {
    const resp = await api.post<Envelope<any> | any>(
        BASE,
        payload,
    );

    return normalizeAdminIndicator(unwrap<any>(resp));
}

export async function updateAdminIndicator(
    id: string,
    payload: UpdateAdminIndicatorPayload,
): Promise<AdminIndicator> {
    const resp = await api.patch<Envelope<any> | any>(
        `${BASE}/${encodeURIComponent(id)}`,
        payload,
    );

    return normalizeAdminIndicator(unwrap<any>(resp));
}

export async function deleteAdminIndicator(
    id: string,
): Promise<{ deleted: boolean }> {
    const resp = await api.delete(
        `${BASE}/${encodeURIComponent(id)}`,
    );

    return unwrap<{ deleted: boolean }>(resp);
}

export async function getWebhookKey(
    id: string,
): Promise<WebhookKeyResponse> {
    const resp = await api.get(
        `${BASE}/${encodeURIComponent(id)}/webhook`,
    );

    return unwrap<WebhookKeyResponse>(resp);
}

export async function revealWebhook(
    id: string,
): Promise<RevealWebhookResponse> {
    const resp = await api.post(
        `${BASE}/${encodeURIComponent(id)}/webhook/reveal`,
    );

    return unwrap<RevealWebhookResponse>(resp);
}

export async function rotateWebhook(
    id: string,
): Promise<RotateWebhookResponse> {
    const resp = await api.post(
        `${BASE}/${encodeURIComponent(id)}/webhook/rotate`,
    );

    return unwrap<RotateWebhookResponse>(resp);
}