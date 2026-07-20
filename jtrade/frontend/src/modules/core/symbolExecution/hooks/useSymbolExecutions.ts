import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type {
    CreateSymbolExecutionDto,
    UpdateSymbolExecutionDto,
} from "../types/symbolExecution";

import {
    createMySymbolExecution,
    deleteMySymbolExecution,
    listMySymbolExecutions,
    updateMySymbolExecution,
    getByAccountRef,
} from "../api/symbolExecutions";

const QK = {
    mine: () => ["symbol-executions", "mine"] as const,
    byAccount: (accountRef: string, symbol?: string, timeframe?: string) =>
        ["symbol-executions", "by-account", accountRef, symbol ?? "", timeframe ?? ""] as const,
};

export function useMySymbolExecutions() {
    return useQuery({
        queryKey: QK.mine(),
        queryFn: listMySymbolExecutions,
        staleTime: 10_000,
    });
}

export function useCreateMySymbolExecution() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateSymbolExecutionDto) => createMySymbolExecution(dto),
        onSuccess: async () => {
            toast.success("Subscription created");
            await qc.invalidateQueries({ queryKey: QK.mine() });
        },
        onError: (e: any) =>
            toast.error(e?.response?.data?.message ?? e?.message ?? "Failed"),
    });
}

export function useUpdateMySymbolExecution() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({ id, dto }: { id: string; dto: UpdateSymbolExecutionDto }) =>
            updateMySymbolExecution(id, dto),
        onSuccess: async () => {
            toast.success("Subscription updated");
            await qc.invalidateQueries({ queryKey: QK.mine() });
        },
        onError: (e: any) =>
            toast.error(e?.response?.data?.message ?? e?.message ?? "Failed"),
    });
}

export function useDeleteMySymbolExecution() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteMySymbolExecution(id),
        onSuccess: async () => {
            toast.success("Subscription removed");
            await qc.invalidateQueries({ queryKey: QK.mine() });
        },
        onError: (e: any) =>
            toast.error(e?.response?.data?.message ?? e?.message ?? "Failed"),
    });
}

export function useByAccountRef(
    accountRef: string,
    symbol?: string,
    timeframe?: string
) {
    return useQuery({
        queryKey: QK.byAccount(accountRef, symbol, timeframe),
        queryFn: () => getByAccountRef({ accountRef, symbol, timeframe }),
        enabled: !!accountRef?.trim(),
        staleTime: 10_000,
    });
}