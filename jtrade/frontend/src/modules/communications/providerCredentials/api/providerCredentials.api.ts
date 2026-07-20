import { api } from "@/app/lib/http";

import type {
    CreateProviderCredentialsDto,
    ProviderCredential,
    ProviderCredentialChannel,
    ProviderCredentialOption,
    UpdateProviderCredentialsDto,
} from "../types/providerCredentials.types";

const BASE = "/communications/provider-credentials";

type ApiResponse<T> = {
    data?: T;
};

function unwrap<T>(res: any): T {
    return (res?.data?.data ?? res?.data) as T;
}

export async function listProviderCredentials(params: {
    companyChannelProviderId: string;
    active?: boolean;
    populate?: boolean;
}): Promise<ProviderCredential[]> {
    const res = await api.get<ApiResponse<ProviderCredential[]>>(BASE, {
        params: {
            companyChannelProviderId: params.companyChannelProviderId,
            ...(typeof params.active === "boolean"
                ? { active: params.active }
                : {}),
            ...(typeof params.populate === "boolean"
                ? { populate: params.populate }
                : {}),
        },
    });

    return unwrap<ProviderCredential[]>(res) ?? [];
}

export async function getProviderCredentialById(
    id: string,
    params?: { populate?: boolean }
): Promise<ProviderCredential> {
    const res = await api.get<ApiResponse<ProviderCredential>>(`${BASE}/${id}`, {
        params: {
            ...(typeof params?.populate === "boolean"
                ? { populate: params.populate }
                : {}),
        },
    });

    return unwrap<ProviderCredential>(res);
}

export async function createProviderCredentials(
    dto: CreateProviderCredentialsDto
): Promise<ProviderCredential> {
    const res = await api.post<ApiResponse<ProviderCredential>>(BASE, dto);
    return unwrap<ProviderCredential>(res);
}

export async function updateProviderCredentials(
    id: string,
    dto: UpdateProviderCredentialsDto
): Promise<ProviderCredential> {
    const res = await api.patch<ApiResponse<ProviderCredential>>(
        `${BASE}/${id}`,
        dto
    );

    return unwrap<ProviderCredential>(res);
}

export async function deleteProviderCredentials(
    id: string
): Promise<{ deleted: boolean }> {
    const res = await api.delete<ApiResponse<{ deleted: boolean }>>(`${BASE}/${id}`);
    return unwrap<{ deleted: boolean }>(res);
}

/**
 * Este endpoint lo usaremos para los selects del Domain Catalogue.
 *
 * Backend esperado:
 * GET /communications/provider-credentials/options?companyId=...&channel=email&active=true
 */
export async function listProviderCredentialOptions(params: {
    companyId: string;
    channel?: ProviderCredentialChannel;
    active?: boolean;
}): Promise<ProviderCredentialOption[]> {
    const res = await api.get<ApiResponse<ProviderCredentialOption[]>>(
        `${BASE}/options`,
        {
            params: {
                companyId: params.companyId,
                ...(params.channel ? { channel: params.channel } : {}),
                ...(typeof params.active === "boolean"
                    ? { active: params.active }
                    : {}),
            },
        }
    );

    return unwrap<ProviderCredentialOption[]>(res) ?? [];
}