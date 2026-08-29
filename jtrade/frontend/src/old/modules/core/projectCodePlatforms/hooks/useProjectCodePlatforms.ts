import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    createMyProjectCodePlatform,
    deactivateProjectCodePlatform,
    getMyProjectCodePlatformById,
    getProjectCodePlatformById,
    listAvailableProjectCodePlatforms,
    listMyProjectCodePlatforms,
    listProjectCodePlatforms,
    removeMyProjectCodePlatform,
    updateMyProjectCodePlatform,
} from "../api/projectCodePlatforms.api";

import type {
    CreateProjectCodePlatformPayload,
    ListProjectCodePlatformsParams,
    ProjectCodePlatform,
    UpdateProjectCodePlatformPayload,
} from "../types/projectCodePlatforms";

const QK = {
    adminList: (params?: ListProjectCodePlatformsParams) =>
        [
            "project-code-platforms",
            "admin",
            params?.active ?? "all",
            params?.codeProjectId ?? "all",
            params?.platformId ?? "all",
        ] as const,

    adminDetail: (id: string) =>
        ["project-code-platforms", "admin", "detail", id] as const,

    available: () => ["project-code-platforms", "available"] as const,

    myList: () => ["project-code-platforms", "my"] as const,

    myDetail: (id: string) =>
        ["project-code-platforms", "my", "detail", id] as const,
};

// ==========================================
// ADMIN
// ==========================================

export function useProjectCodePlatforms(
    params?: ListProjectCodePlatformsParams,
) {
    return useQuery<ProjectCodePlatform[]>({
        queryKey: QK.adminList(params),
        queryFn: () => listProjectCodePlatforms(params),
        placeholderData: [],
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

export function useProjectCodePlatformById(id?: string) {
    return useQuery<ProjectCodePlatform>({
        queryKey: QK.adminDetail(id ?? ""),
        queryFn: () => getProjectCodePlatformById(id!),
        enabled: !!id,
        staleTime: 15_000,
    });
}

export function useDeactivateProjectCodePlatform(
    params?: ListProjectCodePlatformsParams,
) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deactivateProjectCodePlatform(id),

        onSuccess: async () => {
            toast.success("Project platform deactivated");

            await qc.invalidateQueries({
                queryKey: ["project-code-platforms"],
            });

            await qc.invalidateQueries({
                queryKey: QK.adminList(params),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to deactivate project platform",
            );
        },
    });
}

// ==========================================
// CLIENT
// ==========================================

export function useAvailableProjectCodePlatforms() {
    return useQuery<ProjectCodePlatform[]>({
        queryKey: QK.available(),
        queryFn: listAvailableProjectCodePlatforms,
        placeholderData: [],
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

// ==========================================
// PROVIDER
// ==========================================

export function useMyProjectCodePlatforms() {
    return useQuery<ProjectCodePlatform[]>({
        queryKey: QK.myList(),
        queryFn: listMyProjectCodePlatforms,
        placeholderData: [],
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

export function useMyProjectCodePlatformById(id?: string) {
    return useQuery<ProjectCodePlatform>({
        queryKey: QK.myDetail(id ?? ""),
        queryFn: () => getMyProjectCodePlatformById(id!),
        enabled: !!id,
        staleTime: 15_000,
    });
}

export function useCreateMyProjectCodePlatform() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateProjectCodePlatformPayload) =>
            createMyProjectCodePlatform(payload),

        onSuccess: async () => {
            toast.success("Project platform created");

            await qc.invalidateQueries({
                queryKey: QK.myList(),
            });

            await qc.invalidateQueries({
                queryKey: ["project-code-platforms"],
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create project platform",
            );
        },
    });
}

export function useUpdateMyProjectCodePlatform() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
                         id,
                         payload,
                     }: {
            id: string;
            payload: UpdateProjectCodePlatformPayload;
        }) => updateMyProjectCodePlatform(id, payload),

        onSuccess: async (updated) => {
            toast.success("Project platform updated");

            await qc.invalidateQueries({
                queryKey: QK.myList(),
            });

            await qc.invalidateQueries({
                queryKey: QK.myDetail(updated.id),
            });

            await qc.invalidateQueries({
                queryKey: ["project-code-platforms"],
            });

            await qc.invalidateQueries({
                queryKey: QK.available(),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update project platform",
            );
        },
    });
}

export function useRemoveMyProjectCodePlatform() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => removeMyProjectCodePlatform(id),

        onSuccess: async () => {
            toast.success("Project platform deleted");

            await qc.invalidateQueries({
                queryKey: QK.myList(),
            });

            await qc.invalidateQueries({
                queryKey: ["project-code-platforms"],
            });

            await qc.invalidateQueries({
                queryKey: QK.available(),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to delete project platform",
            );
        },
    });
}