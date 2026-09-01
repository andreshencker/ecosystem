// src/hooks/api/useProductVersions.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/http";
import type { ProductVersion, ReplaceProductVersionFilePayload, UploadProductVersionPayload } from "@/types/productVersions";

type Envelope<T> = { status: string; data: T };

const BASE = "/products";
const KEY = (productId: string) => ["product-versions", productId];

function toFormData(fields: Record<string, unknown>, file: File) {
    const fd = new FormData();
    fd.append("file", file);
    for (const [key, value] of Object.entries(fields)) {
        if (value === undefined || value === null || value === "") continue;
        fd.append(key, String(value));
    }
    return fd;
}

export function useProductVersions(productId: string | null) {
    return useQuery<ProductVersion[]>({
        queryKey: KEY(productId ?? ""),
        queryFn: () => api.get<Envelope<ProductVersion[]>>(`${BASE}/${productId}/versions`).then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])),
        enabled: !!productId,
        placeholderData: [],
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function useUploadProductVersion(productId: string | null) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: UploadProductVersionPayload) => {
            const fd = toFormData({ version: payload.version, releaseNotes: payload.releaseNotes, isCurrentVersion: payload.isCurrentVersion }, payload.file);
            return api.post<Envelope<ProductVersion>>(`${BASE}/${productId}/versions`, fd).then((r) => r.data.data);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY(productId ?? "") }),
    });
}

export function useReplaceProductVersionFile(productId: string | null) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: ReplaceProductVersionFilePayload) => {
            const fd = toFormData({ version: payload.version, releaseNotes: payload.releaseNotes, isCurrentVersion: payload.isCurrentVersion }, payload.file);
            return api.put<Envelope<ProductVersion>>(`${BASE}/${productId}/versions/${payload.versionId}/file`, fd).then((r) => r.data.data);
        },
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY(productId ?? "") }),
    });
}

export function useMarkCurrentProductVersion(productId: string | null) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (versionId: string) => api.patch<Envelope<ProductVersion>>(`${BASE}/${productId}/versions/${versionId}/current`).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY(productId ?? "") }),
    });
}

export function useDownloadProductVersion(productId: string | null) {
    return useMutation({
        mutationFn: (versionId: string) =>
            api.get<Envelope<{ downloadUrl: string; fileName: string; expiresInSeconds: number }>>(`${BASE}/${productId}/versions/${versionId}/download`).then((r) => r.data.data),
    });
}
