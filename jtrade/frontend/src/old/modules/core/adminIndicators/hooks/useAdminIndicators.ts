import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    createAdminIndicator,
    deleteAdminIndicator,
    getAdminIndicatorById,
    getWebhookKey,
    listAdminIndicators,
    revealWebhook,
    rotateWebhook,
    updateAdminIndicator,
} from "../api/adminIndicators";

import type {
    CreateAdminIndicatorPayload,
    UpdateAdminIndicatorPayload,
} from "../types/adminIndicators";

const QK = {
    list: () => ["admin-indicators"] as const,
    detail: (id: string) => ["admin-indicators", id] as const,
    webhook: (id: string) => ["admin-indicators", id, "webhook"] as const,
};

export function useAdminIndicators() {
    return useQuery({
        queryKey: QK.list(),
        queryFn: listAdminIndicators,
        retry: false,
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 0,
        placeholderData: [],
    });
}

export function useAdminIndicator(id?: string) {
    return useQuery({
        queryKey: id
            ? QK.detail(id)
            : (["admin-indicators", "empty"] as const),
        queryFn: () => getAdminIndicatorById(id!),
        enabled: !!id,
        retry: false,
    });
}

export function useCreateAdminIndicator() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (payload: CreateAdminIndicatorPayload) =>
            createAdminIndicator(payload),

        onSuccess: async () => {
            toast.success("Webhook created");
            await qc.invalidateQueries({
                queryKey: QK.list(),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create webhook",
            );
        },
    });
}

export function useUpdateAdminIndicator() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (args: {
            id: string;
            data: UpdateAdminIndicatorPayload;
        }) => updateAdminIndicator(args.id, args.data),

        onSuccess: async (updated) => {
            toast.success("Webhook updated");

            await qc.invalidateQueries({
                queryKey: QK.list(),
            });

            if (updated?.id) {
                await qc.invalidateQueries({
                    queryKey: QK.detail(updated.id),
                });
            }
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update webhook",
            );
        },
    });
}

export function useDeleteAdminIndicator() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteAdminIndicator(id),

        onSuccess: async () => {
            toast.success("Webhook deleted");
            await qc.invalidateQueries({
                queryKey: QK.list(),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to delete webhook",
            );
        },
    });
}

export function useGetWebhookKey() {
    return useMutation({
        mutationFn: (id: string) => getWebhookKey(id),

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to get webhook key",
            );
        },
    });
}

export function useRevealWebhook() {
    return useMutation({
        mutationFn: (id: string) => revealWebhook(id),

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to reveal secret",
            );
        },
    });
}

export function useRotateWebhook() {
    return useMutation({
        mutationFn: (id: string) => rotateWebhook(id),

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to rotate secret",
            );
        },
    });
}