// src/hooks/api/usePlatforms.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/http";
import type {
    CreatePlatformPayload,
    ListPlatformsParams,
    Platform,
    UpdatePlatformPayload,
} from "@/types/platforms";

type Envelope<T> = { status: string; data: T };

const BASE = "/platforms";
const PLATFORMS_LIST_KEY = (params?: ListPlatformsParams) => (params ? ["platforms", params] : ["platforms"]);
const PLATFORM_DETAIL_KEY = (id: string) => ["platforms", id];

export function usePlatforms(params?: ListPlatformsParams) {
    return useQuery<Platform[]>({
        queryKey: PLATFORMS_LIST_KEY(params),
        queryFn: () =>
            api
                .get<Envelope<Platform[]>>(BASE, { params: typeof params?.active === "boolean" ? { active: params.active } : undefined })
                .then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])),
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
        queryFn: () => api.get<Envelope<Platform>>(`${BASE}/${id}`).then((r) => r.data.data),
    });
}

export function useCreatePlatform(params?: ListPlatformsParams) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreatePlatformPayload) => api.post<Envelope<Platform>>(BASE, payload).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: PLATFORMS_LIST_KEY(params) }),
    });
}

export function useUpdatePlatform(params?: ListPlatformsParams) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; data: UpdatePlatformPayload }) =>
            api.patch<Envelope<Platform>>(`${BASE}/${args.id}`, args.data).then((r) => r.data.data),
        onSuccess: (updated) => {
            qc.invalidateQueries({ queryKey: PLATFORMS_LIST_KEY(params) });
            if (updated?.id) qc.invalidateQueries({ queryKey: PLATFORM_DETAIL_KEY(updated.id) });
        },
    });
}

export function useDeletePlatform(params?: ListPlatformsParams) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete<Envelope<{ deleted: boolean }>>(`${BASE}/${id}`).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: PLATFORMS_LIST_KEY(params) }),
    });
}

export function useUploadPlatformLogo(params?: ListPlatformsParams) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; file: File }) => {
            const form = new FormData();
            form.append("file", args.file);
            return api
                .post<Envelope<Platform>>(`${BASE}/${args.id}/logo`, form, { headers: { "Content-Type": "multipart/form-data" } })
                .then((r) => r.data.data);
        },
        onSuccess: (updated) => {
            qc.invalidateQueries({ queryKey: PLATFORMS_LIST_KEY(params) });
            qc.invalidateQueries({ queryKey: PLATFORM_DETAIL_KEY(updated.id) });
        },
    });
}
