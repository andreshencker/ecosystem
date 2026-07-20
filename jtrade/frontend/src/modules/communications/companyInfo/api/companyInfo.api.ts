import { api } from "@/app/lib/http";
import type { Company, UpdateCompanyDto } from "../types/companyInfo.types";

const BASE = "/communications/companies";

type ApiResponse<T> = {
    status?: string;
    data: T;
};

export async function getCompanyById(companyId: string): Promise<Company> {
    const response = await api.get<ApiResponse<Company>>(`${BASE}/${companyId}`);
    return response.data.data;
}

export async function updateCompanyByKey(
    companyKey: string,
    dto: UpdateCompanyDto
): Promise<Company> {
    const response = await api.patch<ApiResponse<Company>>(
        `${BASE}/${companyKey}`,
        dto
    );
    return response.data.data;
}