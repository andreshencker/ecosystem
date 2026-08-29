// src/modules/platforms/hooks/usePlatforms.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    createPlatform,
    deletePlatform,
    getPlatformById,
    listPlatforms,
    updatePlatform,
    uploadPlatformLogo,
} from "@/modules/core/platforms/api/platforms";

import type {
    CreatePlatformPayload,
    ListPlatformsParams,
    Platform,
    UpdatePlatformPayload,
} from "@/modules/core/platforms/types/platforms";

const PLATFORMS_LIST_KEY = (params?: ListPlatformsParams) =>
    params ? ["platforms", params] : ["platforms"];

const PLATFORM_DETAIL_KEY = (id: string) => ["platforms", id];

export function usePlatforms(params?: ListPlatformsParams) {
    return useQuery<Platform[]>({
        queryKey: PLATFORMS_LIST_KEY(params),
        queryFn: () => listPlatforms(params),

        // ✅ ahora sí hace fetch automático
        enabled: true,
        placeholderData: [],
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function usePlatform(id?: string) {
    return useQuery<Platform>({
        queryKey: id ? PLATFORM_DETAIL_KEY(id) : ["platforms", "detail", "empty"],
        enabled: !!id,
        queryFn: () => getPlatformById(id!),
    });
}

export function useCreatePlatform(params?: ListPlatformsParams) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreatePlatformPayload) => createPlatform(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: PLATFORMS_LIST_KEY(params) }),
    });
}

export function useUpdatePlatform(params?: ListPlatformsParams) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; data: UpdatePlatformPayload }) =>
            updatePlatform(args.id, args.data),
        onSuccess: (updated: any) => {
            qc.invalidateQueries({ queryKey: PLATFORMS_LIST_KEY(params) });
            if (updated?.id) qc.invalidateQueries({ queryKey: PLATFORM_DETAIL_KEY(updated.id) });
        },
    });
}

export function useDeletePlatform(params?: ListPlatformsParams) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => deletePlatform(id),
        onSuccess: () => qc.invalidateQueries({ queryKey: PLATFORMS_LIST_KEY(params) }),
    });
}

export function useUploadPlatformLogo(params?: ListPlatformsParams) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; file: File }) => uploadPlatformLogo(args.id, args.file),
        onSuccess: (updated) => {
            qc.invalidateQueries({ queryKey: PLATFORMS_LIST_KEY(params) });
            qc.invalidateQueries({ queryKey: PLATFORM_DETAIL_KEY(updated.id) });
        },
    });
}