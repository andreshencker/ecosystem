import { api } from "@/lib/http";

import type {
    CompanyProvider,
    CreateCompanyProviderDto,
    UpdateCompanyProviderDto,
} from "../types/companyProvider";

type ApiResponse<T> = {
    status?: string;
    data?: T;
};

function unwrap<T>(response: T | ApiResponse<T>): T {
    if (
        response &&
        typeof response === "object" &&
        "data" in response
    ) {
        return (response as ApiResponse<T>).data as T;
    }

    return response as T;
}

function normalizeCompanyProvider(raw: any): CompanyProvider {
    return {
        ...raw,
        id: raw.id ?? raw._id,
    };
}

export async function createMyCompanyProvider(
    dto: CreateCompanyProviderDto,
): Promise<CompanyProvider> {
    const { data } = await api.post<ApiResponse<CompanyProvider> | CompanyProvider>(
        "/company-providers/me",
        dto,
    );

    return normalizeCompanyProvider(unwrap<CompanyProvider>(data));
}

export async function getMyCompanyProvider(): Promise<CompanyProvider | null> {
    try {
        const { data } = await api.get<ApiResponse<CompanyProvider> | CompanyProvider>(
            "/company-providers/me",
        );

        const raw = unwrap<CompanyProvider>(data);

        if (!raw) return null;

        return normalizeCompanyProvider(raw);
    } catch (e: any) {
        if (e?.response?.status === 404) return null;
        if (e?.response?.status === 403) return null;

        throw e;
    }
}

export async function updateMyCompanyProvider(
    dto: UpdateCompanyProviderDto,
): Promise<CompanyProvider> {
    const { data } = await api.patch<ApiResponse<CompanyProvider> | CompanyProvider>(
        "/company-providers/me",
        dto,
    );

    return normalizeCompanyProvider(unwrap<CompanyProvider>(data));
}

export async function listCompanyProviders(): Promise<CompanyProvider[]> {
    const { data } = await api.get<ApiResponse<CompanyProvider[]> | CompanyProvider[]>(
        "/company-providers",
    );

    const raw = unwrap<CompanyProvider[]>(data) ?? [];

    return raw.map(normalizeCompanyProvider);
}

export async function getCompanyProviderById(
    id: string,
): Promise<CompanyProvider> {
    const { data } = await api.get<ApiResponse<CompanyProvider> | CompanyProvider>(
        `/company-providers/${encodeURIComponent(id)}`,
    );

    return normalizeCompanyProvider(unwrap<CompanyProvider>(data));
}

export async function deactivateCompanyProvider(
    id: string,
): Promise<{ deactivated: boolean }> {
    const { data } = await api.delete<
        ApiResponse<{ deactivated: boolean }> | { deactivated: boolean }
    >(`/company-providers/${encodeURIComponent(id)}`);

    return unwrap<{ deactivated: boolean }>(data);
}