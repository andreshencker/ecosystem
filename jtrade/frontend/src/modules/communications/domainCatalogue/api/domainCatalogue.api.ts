import { api } from "@/app/lib/http";
import type {
    CreateDomainCatalogueDto,
    DomainCatalogue,
    DomainChannel,
    DomainCredentialsResponse,
    UpdateDomainCatalogueDto,
} from "../types/domainCatalogue.types";

const BASE = "/communications/domain-catalogue";

type ApiResponse<T> = {
    data?: T;
};

function unwrap<T>(res: any): T {
    return (res?.data?.data ?? res?.data) as T;
}

export async function listDomainCatalogue(params: {
    companyId: string;
    active?: boolean;
}): Promise<DomainCatalogue[]> {
    const res = await api.get<ApiResponse<DomainCatalogue[]>>(BASE, {
        params,
    });

    return unwrap<DomainCatalogue[]>(res) ?? [];
}

export async function getDomainCatalogueById(id: string): Promise<DomainCatalogue> {
    const res = await api.get<ApiResponse<DomainCatalogue>>(`${BASE}/${id}`);
    return unwrap<DomainCatalogue>(res);
}

export async function createDomainCatalogue(
    dto: CreateDomainCatalogueDto
): Promise<DomainCatalogue> {
    const res = await api.post<ApiResponse<DomainCatalogue>>(BASE, dto);
    return unwrap<DomainCatalogue>(res);
}

export async function updateDomainCatalogue(
    id: string,
    dto: UpdateDomainCatalogueDto
): Promise<DomainCatalogue> {
    const res = await api.patch<ApiResponse<DomainCatalogue>>(`${BASE}/${id}`, dto);
    return unwrap<DomainCatalogue>(res);
}

export async function deleteDomainCatalogue(
    id: string
): Promise<{ deleted: boolean }> {
    const res = await api.delete<ApiResponse<{ deleted: boolean }>>(`${BASE}/${id}`);
    return unwrap<{ deleted: boolean }>(res);
}

export async function getDomainCredentials(
    id: string
): Promise<DomainCredentialsResponse> {
    const res = await api.get<ApiResponse<DomainCredentialsResponse>>(
        `${BASE}/${id}/credentials`
    );
    return unwrap<DomainCredentialsResponse>(res);
}

export async function updateDomainCredential(params: {
    id: string;
    channel: DomainChannel;
    providerCredentialsId: string;
}): Promise<DomainCredentialsResponse> {
    const res = await api.patch<ApiResponse<DomainCredentialsResponse>>(
        `${BASE}/${params.id}/credentials/${params.channel}`,
        { providerCredentialsId: params.providerCredentialsId }
    );

    return unwrap<DomainCredentialsResponse>(res);
}

export async function bulkUpdateDomainCredentials(params: {
    companyId: string;
    domainIds: string[];
    channel: DomainChannel;
    providerCredentialsId: string;
}): Promise<any> {
    const res = await api.patch<ApiResponse<any>>(`${BASE}/bulk/credentials`, params);
    return unwrap<any>(res);
}