import { api } from "@/app/lib/http";
import type {
    CompanyTheme,
    CreateCompanyThemeDto,
    UpdateCompanyThemeDto,
} from "../types/companyThemes.types";

const BASE = "/communications/company-themes";

type ApiResponse<T> = {
    status?: string;
    data?: T;
};

function unwrap<T>(response: any): T {
    return (response?.data?.data ?? response?.data) as T;
}

export async function listCompanyThemes(params?: {
    companyId?: string;
    active?: boolean;
}): Promise<CompanyTheme[]> {
    const response = await api.get<ApiResponse<CompanyTheme[]>>(BASE, { params });
    return unwrap<CompanyTheme[]>(response) ?? [];
}

export async function getCompanyThemeById(id: string): Promise<CompanyTheme> {
    const response = await api.get<ApiResponse<CompanyTheme>>(`${BASE}/${id}`);
    return unwrap<CompanyTheme>(response);
}

export async function createCompanyTheme(
    dto: CreateCompanyThemeDto
): Promise<CompanyTheme> {
    const response = await api.post<ApiResponse<CompanyTheme>>(BASE, dto);
    return unwrap<CompanyTheme>(response);
}

export async function updateCompanyThemeById(
    id: string,
    dto: UpdateCompanyThemeDto
): Promise<CompanyTheme> {
    const response = await api.put<ApiResponse<CompanyTheme>>(`${BASE}/${id}`, dto);
    return unwrap<CompanyTheme>(response);
}

export async function deleteCompanyThemeById(
    id: string
): Promise<{ deleted: boolean }> {
    const response = await api.delete<ApiResponse<{ deleted: boolean }>>(
        `${BASE}/${id}`
    );
    return unwrap<{ deleted: boolean }>(response);
}