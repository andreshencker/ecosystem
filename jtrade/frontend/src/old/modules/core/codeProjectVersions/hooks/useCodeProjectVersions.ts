import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    downloadCodeProjectVersionById,
    downloadCurrentCodeProjectVersion,
    getCodeProjectVersionById,
    getMyCodeProjectVersionById,
    listCodeProjectVersions,
    listMyCodeProjectVersions,
    removeCodeProjectVersion,
    removeMyCodeProjectVersion,
    replaceMyCodeProjectVersionFile,
    updateMyCodeProjectVersion,
    uploadMyCodeProjectVersion,
} from "../api/codeProjectVersions.api";

import type {
    CodeProjectVersion,
    CreateCodeProjectVersionPayload,
    DownloadCurrentVersionPayload,
    ListCodeProjectVersionsParams,
    ReplaceCodeProjectVersionFilePayload,
    UpdateCodeProjectVersionPayload,
} from "../types/codeProjectVersions";

const QK = {
    adminList: (params?: ListCodeProjectVersionsParams) =>
        [
            "code-project-versions",
            "admin",
            params?.projectCodePlatformId ?? "all",
            params?.codeProjectId ?? "all",
            params?.companyProviderId ?? "all",
            params?.platformId ?? "all",
            params?.active ?? "all",
            params?.current ?? "all",
            params?.populate ?? true,
        ] as const,

    adminDetail: (id: string) =>
        ["code-project-versions", "admin", "detail", id] as const,

    myList: (params?: ListCodeProjectVersionsParams) =>
        [
            "code-project-versions",
            "my",
            params?.projectCodePlatformId ?? "all",
            params?.codeProjectId ?? "all",
            params?.platformId ?? "all",
            params?.active ?? "all",
            params?.current ?? "all",
        ] as const,

    myDetail: (id: string) =>
        ["code-project-versions", "my", "detail", id] as const,
};

export function useCodeProjectVersions(params?: ListCodeProjectVersionsParams) {
    return useQuery<CodeProjectVersion[]>({
        queryKey: QK.adminList(params),
        queryFn: () => listCodeProjectVersions(params),
        placeholderData: [],
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

export function useCodeProjectVersion(id?: string, populate = true) {
    return useQuery<CodeProjectVersion>({
        queryKey: QK.adminDetail(id ?? ""),
        queryFn: () => getCodeProjectVersionById(id!, populate),
        enabled: !!id,
        staleTime: 15_000,
    });
}

export function useMyCodeProjectVersions(params?: ListCodeProjectVersionsParams) {
    return useQuery<CodeProjectVersion[]>({
        queryKey: QK.myList(params),
        queryFn: () => listMyCodeProjectVersions(params),
        placeholderData: [],
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

export function useMyCodeProjectVersion(id?: string) {
    return useQuery<CodeProjectVersion>({
        queryKey: QK.myDetail(id ?? ""),
        queryFn: () => getMyCodeProjectVersionById(id!),
        enabled: !!id,
        staleTime: 15_000,
    });
}

export function useUploadMyCodeProjectVersion(params?: ListCodeProjectVersionsParams) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (args: {
            file: File;
            payload: CreateCodeProjectVersionPayload;
        }) => uploadMyCodeProjectVersion(args.file, args.payload),

        onSuccess: async () => {
            toast.success("Version uploaded");

            await qc.invalidateQueries({
                queryKey: ["code-project-versions"],
            });

            await qc.invalidateQueries({
                queryKey: QK.myList(params),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to upload version",
            );
        },
    });
}

export function useReplaceMyCodeProjectVersionFile(
    params?: ListCodeProjectVersionsParams,
) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (args: {
            id: string;
            file: File;
            payload: ReplaceCodeProjectVersionFilePayload;
        }) => replaceMyCodeProjectVersionFile(args.id, args.file, args.payload),

        onSuccess: async (updated) => {
            toast.success("Version file replaced");

            await qc.invalidateQueries({
                queryKey: ["code-project-versions"],
            });

            await qc.invalidateQueries({
                queryKey: QK.myList(params),
            });

            await qc.invalidateQueries({
                queryKey: QK.myDetail(updated.id),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to replace file",
            );
        },
    });
}

export function useUpdateMyCodeProjectVersion(params?: ListCodeProjectVersionsParams) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (args: {
            id: string;
            payload: UpdateCodeProjectVersionPayload;
        }) => updateMyCodeProjectVersion(args.id, args.payload),

        onSuccess: async (updated) => {
            toast.success("Version updated");

            await qc.invalidateQueries({
                queryKey: ["code-project-versions"],
            });

            await qc.invalidateQueries({
                queryKey: QK.myList(params),
            });

            await qc.invalidateQueries({
                queryKey: QK.myDetail(updated.id),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update version",
            );
        },
    });
}

export function useRemoveMyCodeProjectVersion(params?: ListCodeProjectVersionsParams) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => removeMyCodeProjectVersion(id),

        onSuccess: async () => {
            toast.success("Version deleted");

            await qc.invalidateQueries({
                queryKey: ["code-project-versions"],
            });

            await qc.invalidateQueries({
                queryKey: QK.myList(params),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to delete version",
            );
        },
    });
}

export function useRemoveCodeProjectVersion(params?: ListCodeProjectVersionsParams) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => removeCodeProjectVersion(id),

        onSuccess: async () => {
            toast.success("Version deleted");

            await qc.invalidateQueries({
                queryKey: ["code-project-versions"],
            });

            await qc.invalidateQueries({
                queryKey: QK.adminList(params),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to delete version",
            );
        },
    });
}

export function useDownloadCurrentCodeProjectVersion() {
    return useMutation({
        mutationFn: (args: {
            projectCodePlatformId: string;
            params?: DownloadCurrentVersionPayload;
        }) =>
            downloadCurrentCodeProjectVersion(
                args.projectCodePlatformId,
                args.params,
            ),
    });
}

export function useDownloadCodeProjectVersionById() {
    return useMutation({
        mutationFn: (args: {
            id: string;
            params?: DownloadCurrentVersionPayload;
        }) => downloadCodeProjectVersionById(args.id, args.params),
    });
}