import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type {
    CreateIndicatorDto,
    ListIndicatorsParams,
    UpdateIndicatorDto,
} from "../types/indicators";

import {
    createIndicator,
    deleteIndicator,
    listIndicators,
    updateIndicator,
} from "../api/indicators.api";

const QK = {
    indicators: (params?: ListIndicatorsParams) =>
        [
            "indicators",
            params?.companyProviderId ?? "all",
            params?.isActive ?? "all",
        ] as const,

    indicatorsOptions: (companyProviderId?: string) =>
        ["indicators", "options", companyProviderId ?? "all"] as const,
};

export function useIndicators(
    params?: ListIndicatorsParams,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: QK.indicators(params),
        queryFn: () => listIndicators(params),
        enabled: options?.enabled ?? true,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: "always",
        staleTime: 0,
        gcTime: 0,
    });
}

export function useCreateIndicator() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateIndicatorDto) => createIndicator(dto),

        onSuccess: async () => {
            toast.success("Indicator created");
            await qc.invalidateQueries({ queryKey: ["indicators"] });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create indicator",
            );
        },
    });
}

export function useUpdateIndicator() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: string; data: UpdateIndicatorDto }) =>
            updateIndicator(args.id, args.data),

        onSuccess: async () => {
            toast.success("Indicator updated");
            await qc.invalidateQueries({ queryKey: ["indicators"] });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update indicator",
            );
        },
    });
}

export function useDeleteIndicator() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteIndicator(id),

        onSuccess: async () => {
            toast.success("Indicator deleted");
            await qc.invalidateQueries({ queryKey: ["indicators"] });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to delete indicator",
            );
        },
    });
}

export function useIndicatorsOptions(
    companyProviderId?: string,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: QK.indicatorsOptions(companyProviderId),
        queryFn: async () => {
            const list = await listIndicators({
                companyProviderId,
                isActive: true,
            });

            return list.map((i) => ({
                id: i.id,
                companyProviderId: i.companyProviderId,
                name: i.name,
                key: i.key,
                isActive: i.isActive,
            }));
        },
        enabled: options?.enabled ?? !!companyProviderId,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: "always",
        staleTime: 0,
        gcTime: 0,
    });
}