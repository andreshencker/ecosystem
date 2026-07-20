import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    createMyCodeProject,
    deactivateCodeProject,
    getCodeProjectById,
    getMyCodeProjectById,
    listCodeProjects,
    listMyCodeProjects,
    removeMyCodeProject,
    updateMyCodeProject,
} from "@/modules/core/codeProjects/api/codeProjects.api";

import type {
    CodeProject,
    CreateCodeProjectPayload,
    ListCodeProjectsParams,
    UpdateCodeProjectPayload,
} from "@/modules/core/codeProjects/types/codeProjects";

const QK = {
    adminList: (params?: ListCodeProjectsParams) =>
        [
            "code-projects",
            "admin",
            params?.active ?? "all",
            params?.companyProviderId ?? "all",
            params?.typeProjectId ?? "all",
        ] as const,

    adminDetail: (id: string) => ["code-projects", "admin", "detail", id] as const,

    myList: () => ["code-projects", "my"] as const,

    myDetail: (id: string) => ["code-projects", "my", "detail", id] as const,
};

/**
 * ADMIN: visión general de todos los proyectos.
 */
export function useCodeProjects(params?: ListCodeProjectsParams) {
    return useQuery<CodeProject[]>({
        queryKey: QK.adminList(params),
        queryFn: () => listCodeProjects(params),
        placeholderData: [],
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

export function useCodeProjectById(id?: string) {
    return useQuery<CodeProject>({
        queryKey: QK.adminDetail(id ?? ""),
        queryFn: () => getCodeProjectById(id!),
        enabled: !!id,
        staleTime: 15_000,
    });
}

export function useDeactivateCodeProject(params?: ListCodeProjectsParams) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deactivateCodeProject(id),

        onSuccess: async () => {
            toast.success("Project deactivated");

            await qc.invalidateQueries({
                queryKey: ["code-projects"],
            });

            await qc.invalidateQueries({
                queryKey: QK.adminList(params),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to deactivate project",
            );
        },
    });
}

/**
 * PROVIDER: CRUD de mis proyectos.
 */
export function useMyCodeProjects() {
    return useQuery<CodeProject[]>({
        queryKey: QK.myList(),
        queryFn: listMyCodeProjects,
        placeholderData: [],
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

export function useMyCodeProjectById(id?: string) {
    return useQuery<CodeProject>({
        queryKey: QK.myDetail(id ?? ""),
        queryFn: () => getMyCodeProjectById(id!),
        enabled: !!id,
        staleTime: 15_000,
    });
}

export function useCreateMyCodeProject() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateCodeProjectPayload) =>
            createMyCodeProject(payload),

        onSuccess: async () => {
            toast.success("Project created");

            await qc.invalidateQueries({
                queryKey: QK.myList(),
            });

            await qc.invalidateQueries({
                queryKey: ["code-projects"],
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create project",
            );
        },
    });
}

export function useUpdateMyCodeProject() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
                         id,
                         payload,
                     }: {
            id: string;
            payload: UpdateCodeProjectPayload;
        }) => updateMyCodeProject(id, payload),

        onSuccess: async (updated) => {
            toast.success("Project updated");

            await qc.invalidateQueries({
                queryKey: QK.myList(),
            });

            await qc.invalidateQueries({
                queryKey: QK.myDetail(updated.id),
            });

            await qc.invalidateQueries({
                queryKey: ["code-projects"],
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update project",
            );
        },
    });
}

export function useRemoveMyCodeProject() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => removeMyCodeProject(id),

        onSuccess: async () => {
            toast.success("Project deleted");

            await qc.invalidateQueries({
                queryKey: QK.myList(),
            });

            await qc.invalidateQueries({
                queryKey: ["code-projects"],
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to delete project",
            );
        },
    });
}