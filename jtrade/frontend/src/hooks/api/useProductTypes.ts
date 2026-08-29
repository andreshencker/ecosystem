// src/hooks/api/useProductTypes.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/http";
import type {
    CreateProductTypePayload,
    ProductType,
    UpdateProductTypePayload,
} from "@/types/productTypes";

type Envelope<T> = { status: string; data: T };

const BASE = "/type-products";
const PRODUCT_TYPES_LIST_KEY = ["product-types"];

export function useProductTypes() {
    return useQuery<ProductType[]>({
        queryKey: PRODUCT_TYPES_LIST_KEY,
        queryFn: () => api.get<Envelope<ProductType[]>>(BASE).then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])),
        placeholderData: [],
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function useCreateProductType() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateProductTypePayload) => api.post<Envelope<ProductType>>(BASE, payload).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_TYPES_LIST_KEY }),
    });
}

export function useUpdateProductType() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; data: UpdateProductTypePayload }) =>
            api.patch<Envelope<ProductType>>(`${BASE}/${args.id}`, args.data).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_TYPES_LIST_KEY }),
    });
}

export function useDeactivateProductType() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete<Envelope<{ deactivated: boolean }>>(`${BASE}/${id}`).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_TYPES_LIST_KEY }),
    });
}

export function useSeedProductTypes() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: () => api.post<Envelope<{ seeded: boolean; count: number }>>(`${BASE}/seed`).then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: PRODUCT_TYPES_LIST_KEY }),
    });
}
