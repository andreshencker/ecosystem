import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    adminRemoveUserProjectPlatform,
    adminUpdateUserProjectPlatform,
    createMyUserProjectPlatform,
    getMyUserProjectPlatformById,
    listMyUserProjectPlatforms,
    listUserProjectPlatforms,
    markMyUserProjectPlatformDownloaded,
    removeMyUserProjectPlatform,
    updateMyUserProjectPlatform,
} from "../api/userProjectPlatforms";

import type {
    CreateUserProjectPlatformDto,
    ListUserProjectPlatformsParams,
    UpdateUserProjectPlatformDto,
    UserProjectPlatform,
} from "../types/userProjectPlatforms";

const QK = {
    myList: () => ["user-project-platforms", "my"] as const,

    myDetail: (id: string) =>
        ["user-project-platforms", "my", id] as const,

    adminList: (params?: ListUserProjectPlatformsParams) =>
        [
            "user-project-platforms",
            "admin",
            params?.userId ?? "all",
            params?.projectCodePlatformId ?? "all",
            params?.isActive ?? "all",
        ] as const,
};

// ==========================================
// CLIENT
// ==========================================

export function useMyUserProjectPlatforms() {
    return useQuery<UserProjectPlatform[]>({
        queryKey: QK.myList(),
        queryFn: listMyUserProjectPlatforms,
        placeholderData: [],
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

export function useMyUserProjectPlatform(id?: string) {
    return useQuery<UserProjectPlatform>({
        queryKey: QK.myDetail(id ?? ""),
        queryFn: () => getMyUserProjectPlatformById(id!),
        enabled: !!id,
        staleTime: 15_000,
    });
}

export function useCreateMyUserProjectPlatform() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateUserProjectPlatformDto) =>
            createMyUserProjectPlatform(dto),

        onSuccess: async () => {
            toast.success("Subscription created");

            await qc.invalidateQueries({
                queryKey: QK.myList(),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create subscription",
            );
        },
    });
}

export function useUpdateMyUserProjectPlatform() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (args: {
            id: string;
            dto: UpdateUserProjectPlatformDto;
        }) => updateMyUserProjectPlatform(args.id, args.dto),

        onSuccess: async (updated) => {
            toast.success("Subscription updated");

            await qc.invalidateQueries({
                queryKey: QK.myList(),
            });

            await qc.invalidateQueries({
                queryKey: QK.myDetail(updated.id),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update subscription",
            );
        },
    });
}

export function useRemoveMyUserProjectPlatform() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => removeMyUserProjectPlatform(id),

        onSuccess: async () => {
            toast.success("Subscription removed");

            await qc.invalidateQueries({
                queryKey: QK.myList(),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to remove subscription",
            );
        },
    });
}

export function useMarkMyUserProjectPlatformDownloaded() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            markMyUserProjectPlatformDownloaded(id),

        onSuccess: async () => {
            await qc.invalidateQueries({
                queryKey: QK.myList(),
            });
        },
    });
}

// ==========================================
// ADMIN
// ==========================================

export function useUserProjectPlatforms(
    params?: ListUserProjectPlatformsParams,
) {
    return useQuery<UserProjectPlatform[]>({
        queryKey: QK.adminList(params),
        queryFn: () => listUserProjectPlatforms(params),
        placeholderData: [],
        staleTime: 15_000,
        refetchOnWindowFocus: false,
    });
}

export function useAdminUpdateUserProjectPlatform(
    params?: ListUserProjectPlatformsParams,
) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (args: {
            id: string;
            dto: UpdateUserProjectPlatformDto;
        }) => adminUpdateUserProjectPlatform(args.id, args.dto),

        onSuccess: async () => {
            toast.success("Subscription updated");

            await qc.invalidateQueries({
                queryKey: QK.adminList(params),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update subscription",
            );
        },
    });
}

export function useAdminRemoveUserProjectPlatform(
    params?: ListUserProjectPlatformsParams,
) {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) =>
            adminRemoveUserProjectPlatform(id),

        onSuccess: async () => {
            toast.success("Subscription removed");

            await qc.invalidateQueries({
                queryKey: QK.adminList(params),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to remove subscription",
            );
        },
    });
}