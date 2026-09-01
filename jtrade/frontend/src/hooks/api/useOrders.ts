// src/hooks/api/useOrders.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type { Order } from "@/types/order";

type Envelope<T> = { status: string; data: T };

export function useMyOrders() {
    return useQuery<Order[]>({
        queryKey: ["orders", "mine"],
        queryFn: () => api.get<Envelope<Order[]>>("/orders/mine").then((r) => r.data.data),
        placeholderData: [],
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function useSales() {
    return useQuery<Order[]>({
        queryKey: ["orders", "sales"],
        queryFn: () => api.get<Envelope<Order[]>>("/orders").then((r) => r.data.data),
        placeholderData: [],
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function useCheckout() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: { productId: string; pricingId: string }) =>
            api.post<Envelope<Order>>("/orders", payload).then((r) => r.data.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast.success("Order placed."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not place the order.")),
    });
}

export function useCancelOrder() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.post<Envelope<Order>>(`/orders/${id}/cancel`).then((r) => r.data.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["orders"] }); toast.success("Order cancelled."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not cancel the order.")),
    });
}
