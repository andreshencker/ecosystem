import { api } from "@/app/lib/http";
import type {
    LayoutTemplate,
    CreateLayoutTemplateDto,
    UpdateLayoutTemplateDto,
} from "../types/layoutTemplates.types";

const BASE = "/communications/layout-templates";

type ApiResponse<T> = {
    data?: T;
};

function unwrap<T>(res: any): T {
    return (res?.data?.data ?? res?.data) as T;
}

export async function listLayoutTemplates(companyId: string): Promise<LayoutTemplate[]> {
    const res = await api.get<ApiResponse<any>>(`${BASE}/by-company`, {
        params: { companyId },
    });

    const data = unwrap<any>(res);
    return data?.templates ?? [];
}

export async function getLayoutTemplateById(id: string): Promise<LayoutTemplate> {
    const res = await api.get<ApiResponse<LayoutTemplate>>(`${BASE}/${id}`);
    return unwrap<LayoutTemplate>(res);
}

export async function createLayoutTemplate(
    dto: CreateLayoutTemplateDto
): Promise<LayoutTemplate> {
    const res = await api.post<ApiResponse<LayoutTemplate>>(BASE, dto);
    return unwrap<LayoutTemplate>(res);
}

export async function updateLayoutTemplate(
    id: string,
    dto: UpdateLayoutTemplateDto
): Promise<LayoutTemplate> {
    const res = await api.patch<ApiResponse<LayoutTemplate>>(`${BASE}/${id}`, dto);
    return unwrap<LayoutTemplate>(res);
}

export async function deleteLayoutTemplate(
    id: string
): Promise<{ deleted: boolean }> {
    const res = await api.delete<ApiResponse<{ deleted: boolean }>>(`${BASE}/${id}`);
    return unwrap<{ deleted: boolean }>(res);
}