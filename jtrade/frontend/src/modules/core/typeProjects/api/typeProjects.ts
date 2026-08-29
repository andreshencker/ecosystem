import { api } from "@/lib/http";

import type {
    CreateTypeProjectDto,
    TypeProject,
    UpdateTypeProjectDto,
} from "../types/typeProject";

type ApiResponse<T> = {
    status: string;
    data: T;
};

function unwrap<T>(response: T | ApiResponse<T>): T {
    if (
        response &&
        typeof response === "object" &&
        "data" in response &&
        "status" in response
    ) {
        return (response as ApiResponse<T>).data;
    }

    return response as T;
}

export async function createTypeProject(
    dto: CreateTypeProjectDto,
): Promise<TypeProject> {
    const { data } = await api.post<ApiResponse<TypeProject> | TypeProject>(
        "/type-projects",
        dto,
    );

    return unwrap<TypeProject>(data);
}

export async function listTypeProjects(): Promise<TypeProject[]> {
    const { data } = await api.get<ApiResponse<TypeProject[]> | TypeProject[]>(
        "/type-projects",
    );

    return unwrap<TypeProject[]>(data);
}

export async function listActiveTypeProjects(): Promise<TypeProject[]> {
    const { data } = await api.get<ApiResponse<TypeProject[]> | TypeProject[]>(
        "/type-projects/active",
    );

    return unwrap<TypeProject[]>(data);
}

export async function getTypeProjectById(id: string): Promise<TypeProject> {
    const { data } = await api.get<ApiResponse<TypeProject> | TypeProject>(
        `/type-projects/${id}`,
    );

    return unwrap<TypeProject>(data);
}

export async function updateTypeProject(
    id: string,
    dto: UpdateTypeProjectDto,
): Promise<TypeProject> {
    const { data } = await api.patch<ApiResponse<TypeProject> | TypeProject>(
        `/type-projects/${id}`,
        dto,
    );

    return unwrap<TypeProject>(data);
}

export async function deactivateTypeProject(
    id: string,
): Promise<{ deactivated: boolean }> {
    const { data } = await api.delete<
        ApiResponse<{ deactivated: boolean }> | { deactivated: boolean }
    >(`/type-projects/${id}`);

    return unwrap<{ deactivated: boolean }>(data);
}

export async function seedTypeProjects(): Promise<{
    seeded: boolean;
    count: number;
}> {
    const { data } = await api.post<
        ApiResponse<{ seeded: boolean; count: number }> | {
        seeded: boolean;
        count: number;
    }
    >("/type-projects/seed");

    return unwrap<{ seeded: boolean; count: number }>(data);
}