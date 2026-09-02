// src/hooks/api/useSymbols.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type { BulkCreateResult, CreateSymbolPayload, SymbolItem, UpdateSymbolPayload } from "@/types/symbol";

type Envelope<T> = { status: string; data: T };

const BASE = "/symbols";
const KEY = ["symbols"];

export function useSymbols() {
    return useQuery<SymbolItem[]>({
        queryKey: KEY,
        queryFn: () => api.get<Envelope<SymbolItem[]>>(BASE).then((r) => r.data.data),
        placeholderData: [],
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function useCreateSymbol() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateSymbolPayload) =>
            api.post<Envelope<SymbolItem>>(BASE, payload).then((r) => r.data.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Symbol added."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not add the symbol.")),
    });
}

export function useBulkCreateSymbols() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (symbols: string[]) =>
            api.post<Envelope<BulkCreateResult>>(`${BASE}/bulk`, { symbols }).then((r) => r.data.data),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: KEY });
            toast.success(`${res.created} added${res.skipped ? `, ${res.skipped} already existed` : ""}.`);
        },
        onError: (err) => toast.error(errorToMessage(err, "Could not import symbols.")),
    });
}

export function useUpdateSymbol() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; data: UpdateSymbolPayload }) =>
            api.patch<Envelope<SymbolItem>>(`${BASE}/${args.id}`, args.data).then((r) => r.data.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Symbol updated."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not update the symbol.")),
    });
}

export function useSetSymbolStatus() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; isActive: boolean }) =>
            api.patch<Envelope<SymbolItem>>(`${BASE}/${args.id}/status`, { isActive: args.isActive }).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
        onError: (err) => toast.error(errorToMessage(err, "Could not change the status.")),
    });
}

export function useDeleteSymbol() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`${BASE}/${id}`).then((r) => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Symbol deleted."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not delete the symbol.")),
    });
}
