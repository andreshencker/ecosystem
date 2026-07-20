// src/modules/users/hooks/useUsers.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type { CreateUserAdminDto, UpdateProfileDto } from "../types/user";
import {
    createUserAsAdmin,
    deleteUser,
    getMe,
    listUsers,
    updateMyProfile,
} from "../api/users";

const QK = {
    users: () => ["users"] as const,
    me: () => ["auth", "me"] as const,
};

export function useUsers() {
    return useQuery({
        queryKey: QK.users(),
        queryFn: listUsers,
        staleTime: 15_000,
    });
}

export function useCreateUserAsAdmin() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateUserAdminDto) => createUserAsAdmin(dto),
        onSuccess: async () => {
            toast.success("User created");
            await qc.invalidateQueries({ queryKey: QK.users() });
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed to create user"),
    });
}

export function useDeleteUser() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteUser(id),
        onSuccess: async () => {
            toast.success("User deleted");
            await qc.invalidateQueries({ queryKey: QK.users() });
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed to delete user"),
    });
}

export function useMe() {
    return useQuery({
        queryKey: QK.me(),
        queryFn: getMe,
        staleTime: 10_000,
    });
}

export function useUpdateMyProfile() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: UpdateProfileDto) => updateMyProfile(dto),
        onSuccess: async () => {
            toast.success("Profile updated");
            await qc.invalidateQueries({ queryKey: QK.me() });
        },
        onError: (e: any) => toast.error(e?.message ?? "Failed to update profile"),
    });
}