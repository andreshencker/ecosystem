// src/modules/userPlatforms/hooks/useUserPlatforms.ts
import {useMutation, useQuery, useQueryClient} from "@tanstack/react-query";

import {
    adminCreateUserPlatform,
    adminUpdateUserPlatform,
    changeMyUserPlatformStatus,
    createMyUserPlatform,
    getMyUserPlatformById,
    listAllUserPlatforms,
    listMyUserPlatforms,
    removeMyUserPlatform,
    setDefaultMyUserPlatform,
    updateMyUserPlatform,
} from "@/modules/core/userPlatforms/api/userPlatforms";

import type {
    AdminCreateUserPlatformPayload,
    AdminUpdateUserPlatformPayload,
    ChangeMyUserPlatformStatusPayload,
    CreateMyUserPlatformPayload,
    ListAllUserPlatformsParams,
    UpdateMyUserPlatformPayload,
    UserPlatform,
} from "@/modules/core/userPlatforms/types/userPlatforms";

// keys
const MY_LIST_KEY = ["user-platforms", "mine"] as const;
const MY_DETAIL_KEY = (id: string) => ["user-platforms", "mine", id] as const;

// ✅ key estable (sin meter el objeto params completo)
const ADMIN_LIST_KEY = (params?: ListAllUserPlatformsParams) =>
    [
        "user-platforms",
        "admin",
        params?.userId ?? "all",
        params?.platformId ?? "all",
        params?.isActive ?? "all",
        params?.role ?? "all",
    ] as const;

const ADMIN_DETAIL_KEY = (id: string) => ["user-platforms", "admin", id] as const;

// CLIENT / ME
export function useMyUserPlatforms() {
    return useQuery<UserPlatform[]>({
        queryKey: MY_LIST_KEY,
        queryFn: listMyUserPlatforms,
        placeholderData: [],
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        staleTime: 0,
    });
}

export function useMyUserPlatform(id?: string) {
    return useQuery<UserPlatform>({
        queryKey: id ? MY_DETAIL_KEY(id) : (["user-platforms", "mine", "empty"] as const),
        enabled: !!id,
        queryFn: () => getMyUserPlatformById(id!),
    });
}

export function useCreateMyUserPlatform() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateMyUserPlatformPayload) => createMyUserPlatform(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: MY_LIST_KEY }),
    });
}

export function useSetDefaultMyUserPlatform() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string }) => setDefaultMyUserPlatform(args.id),
        onSuccess: () => qc.invalidateQueries({ queryKey: MY_LIST_KEY }),
    });
}

export function useChangeMyUserPlatformStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; data: ChangeMyUserPlatformStatusPayload }) =>
            changeMyUserPlatformStatus(args.id, args.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: MY_LIST_KEY }),
    });
}

export function useUpdateMyUserPlatform() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; data: UpdateMyUserPlatformPayload }) =>
            updateMyUserPlatform(args.id, args.data),
        onSuccess: (updated) => {
            qc.invalidateQueries({ queryKey: MY_LIST_KEY });
            qc.invalidateQueries({ queryKey: MY_DETAIL_KEY(updated.id) });
        },
    });
}

export function useRemoveMyUserPlatform() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string }) => removeMyUserPlatform(args.id),
        onSuccess: () => qc.invalidateQueries({ queryKey: MY_LIST_KEY }),
    });
}

// ADMIN
export function useAdminUserPlatforms(params?: ListAllUserPlatformsParams) {
    return useQuery<UserPlatform[]>({
        queryKey: ADMIN_LIST_KEY(params),
        queryFn: () => listAllUserPlatforms(params),
        placeholderData: [],
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        staleTime: 0,
    });
}

export function useAdminCreateUserPlatform(params?: ListAllUserPlatformsParams) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: AdminCreateUserPlatformPayload) => adminCreateUserPlatform(payload),
        onSuccess: () => qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY(params) }),
    });
}

export function useAdminUpdateUserPlatform(params?: ListAllUserPlatformsParams) {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; data: AdminUpdateUserPlatformPayload }) =>
            adminUpdateUserPlatform(args.id, args.data),
        onSuccess: (updated) => {
            qc.invalidateQueries({ queryKey: ADMIN_LIST_KEY(params) });
            qc.invalidateQueries({ queryKey: ADMIN_DETAIL_KEY(updated.id) });
        },
    });
}