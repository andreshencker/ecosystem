// src/hooks/api/useProducts.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/http";
import type { CreateProductPayload, Product, UpdateProductPayload } from "@/types/products";

type Envelope<T> = { status: string; data: T };

const BASE = "/products";
const KEY = (scope: "mine" | "review") => ["products", scope];

export function useProducts(scope: "mine" | "review" = "mine") {
    return useQuery<Product[]>({
        queryKey: KEY(scope),
        queryFn: () =>
            api.get<Envelope<Product[]>>(`${BASE}/${scope === "review" ? "review" : "mine"}`).then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])),
        placeholderData: [],
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function useMarketplaceProducts() {
    return useQuery<Product[]>({
        queryKey: ["products", "marketplace"],
        queryFn: () => api.get<Envelope<Product[]>>(`${BASE}/marketplace`).then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])),
        placeholderData: [],
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function useCreateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateProductPayload) => api.post<Envelope<Product>>(BASE, payload).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY("mine") }),
    });
}

export function useUpdateProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; data: UpdateProductPayload }) =>
            api.patch<Envelope<Product>>(`${BASE}/${args.id}`, args.data).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY("mine") }),
    });
}

export function useReviewProduct() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; status: "published" | "suspended" | "draft" }) =>
            api.patch<Envelope<Product>>(`${BASE}/${args.id}/review/${args.status}`).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY("review") }),
    });
}

