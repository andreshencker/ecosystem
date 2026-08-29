import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type {
    BulkCreateSymbolDto,
    CreateSymbolDto,
    ListSymbolsParams,
    UpdateSymbolDto,
} from "../types/symbols";

import {
    bulkCreateSymbols,
    createSymbol,
    deleteSymbol,
    listSymbols,
    updateSymbol,
    updateSymbolStatus,
} from "../api/symbols.api";

const QK = {
    list: (params?: ListSymbolsParams) =>
        [
            "symbols",
            params?.companyProviderId ?? "all",
            params?.isActive ?? "all",
        ] as const,

    options: (companyProviderId?: string) =>
        ["symbols", "options", companyProviderId ?? "all"] as const,
};

export function useSymbols(
    params?: ListSymbolsParams,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: QK.list(params),
        queryFn: () => listSymbols(params),
        enabled: options?.enabled ?? true,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 0,
    });
}

export function useSymbolsOptions(
    companyProviderId?: string,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: QK.options(companyProviderId),
        queryFn: async () => {
            const rows = await listSymbols({
                companyProviderId,
                isActive: true,
            });

            return rows.map((row) => ({
                id: row.id,
                companyProviderId: row.companyProviderId,
                symbol: row.symbol,
                isActive: row.isActive,
            }));
        },
        enabled: options?.enabled ?? !!companyProviderId,
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
    });
}

export function useCreateSymbol() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateSymbolDto) => createSymbol(dto),

        onSuccess: async () => {
            toast.success("Symbol created");
            await qc.invalidateQueries({ queryKey: ["symbols"] });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create symbol",
            );
        },
    });
}

export function useBulkCreateSymbols() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: BulkCreateSymbolDto) => bulkCreateSymbols(dto),

        onSuccess: async (res) => {
            toast.success(`${res.total} symbols created`);
            await qc.invalidateQueries({ queryKey: ["symbols"] });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create symbols",
            );
        },
    });
}

export function useUpdateSymbol() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: string; data: UpdateSymbolDto }) =>
            updateSymbol(args.id, args.data),

        onSuccess: async () => {
            toast.success("Symbol updated");
            await qc.invalidateQueries({ queryKey: ["symbols"] });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update symbol",
            );
        },
    });
}

export function useUpdateSymbolStatus() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (args: { id: string; isActive: boolean }) =>
            updateSymbolStatus(args.id, args.isActive),

        onSuccess: async () => {
            toast.success("Symbol status updated");
            await qc.invalidateQueries({ queryKey: ["symbols"] });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update status",
            );
        },
    });
}

export function useDeleteSymbol() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteSymbol(id),

        onSuccess: async () => {
            toast.success("Symbol deleted");
            await qc.invalidateQueries({ queryKey: ["symbols"] });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to delete symbol",
            );
        },
    });
}