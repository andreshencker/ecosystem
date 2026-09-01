import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type {
    AvailableChannel, CreateSignalbotPayload, ExecutionPayload, Signalbot, UpdateSignalbotPayload,
} from "@/types/signalbot";

type Envelope<T> = { status: string; data: T };
const BASE = "/signalbots";
const KEY = ["signalbots"];

export function useSignalbots() {
    return useQuery<Signalbot[]>({
        queryKey: KEY,
        queryFn: () => api.get<Envelope<Signalbot[]>>(BASE).then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])),
        placeholderData: [],
        refetchOnWindowFocus: false,
        staleTime: 0,
    });
}

export function useAvailableChannels(signalbotId?: string) {
    return useQuery<AvailableChannel[]>({
        queryKey: ["signalbots", signalbotId, "channels"],
        enabled: !!signalbotId,
        queryFn: () => api.get<Envelope<AvailableChannel[]>>(`${BASE}/${signalbotId}/available-channels`).then((r) => r.data.data),
        refetchOnWindowFocus: false,
    });
}

export function useProductChannels(productId?: string) {
    return useQuery<AvailableChannel[]>({
        queryKey: ["signalbots", "product-channels", productId],
        enabled: !!productId,
        queryFn: () => api.get<Envelope<AvailableChannel[]>>(`${BASE}/products/${productId}/channels`).then((r) => r.data.data),
        refetchOnWindowFocus: false,
    });
}

function mutationHooks() {
    const qc = useQueryClient();
    const done = () => qc.invalidateQueries({ queryKey: KEY });
    return { done };
}

export function useCreateSignalbot() {
    const { done } = mutationHooks();
    return useMutation({
        mutationFn: (payload: CreateSignalbotPayload) => api.post<Envelope<Signalbot>>(BASE, payload).then((r) => r.data.data),
        onSuccess: () => { done(); toast.success("Bot created."); },
        onError: (e) => toast.error(errorToMessage(e, "Could not create the bot.")),
    });
}

export function useUpdateSignalbot() {
    const { done } = mutationHooks();
    return useMutation({
        mutationFn: (a: { id: string; data: UpdateSignalbotPayload }) =>
            api.patch<Envelope<Signalbot>>(`${BASE}/${a.id}`, a.data).then((r) => r.data.data),
        onSuccess: () => done(),
        onError: (e) => toast.error(errorToMessage(e, "Could not update the bot.")),
    });
}

export function useRotateSignalbotToken() {
    const { done } = mutationHooks();
    return useMutation({
        mutationFn: (id: string) => api.post<Envelope<Signalbot>>(`${BASE}/${id}/token/rotate`).then((r) => r.data.data),
        onSuccess: () => { done(); toast.success("Token rotated."); },
        onError: (e) => toast.error(errorToMessage(e, "Could not rotate the token.")),
    });
}

export function useDeleteSignalbot() {
    const { done } = mutationHooks();
    return useMutation({
        mutationFn: (id: string) => api.delete(`${BASE}/${id}`).then((r) => r.data),
        onSuccess: () => { done(); toast.success("Bot deleted."); },
        onError: (e) => toast.error(errorToMessage(e, "Could not delete the bot.")),
    });
}

export function useAddExecution() {
    const { done } = mutationHooks();
    return useMutation({
        mutationFn: (a: { id: string; data: ExecutionPayload }) =>
            api.post<Envelope<Signalbot>>(`${BASE}/${a.id}/executions`, a.data).then((r) => r.data.data),
        onSuccess: () => { done(); toast.success("Symbol added."); },
        onError: (e) => toast.error(errorToMessage(e, "Could not add the symbol.")),
    });
}

export function useUpdateExecution() {
    const { done } = mutationHooks();
    return useMutation({
        mutationFn: (a: { id: string; channelId: string; data: Record<string, unknown> }) =>
            api.patch<Envelope<Signalbot>>(`${BASE}/${a.id}/executions/${a.channelId}`, a.data).then((r) => r.data.data),
        onSuccess: () => done(),
        onError: (e) => toast.error(errorToMessage(e, "Could not update the symbol.")),
    });
}

export function useRemoveExecution() {
    const { done } = mutationHooks();
    return useMutation({
        mutationFn: (a: { id: string; channelId: string }) =>
            api.delete(`${BASE}/${a.id}/executions/${a.channelId}`).then((r) => r.data),
        onSuccess: () => { done(); toast.success("Symbol removed."); },
        onError: (e) => toast.error(errorToMessage(e, "Could not remove the symbol.")),
    });
}
