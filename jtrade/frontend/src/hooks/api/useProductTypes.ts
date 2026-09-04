// src/hooks/api/useProductTypes.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type {
    CreateProductTypePayload,
    ProductType,
    UpdateProductTypePayload,
} from "@/types/productTypes";

type Envelope<T> = { status: string; data: T };

const BASE = "/type-products";
const LIST_KEY = ["product-types"];
const ACTIVE_KEY = ["product-types", "active"];

/** All types (admin catalogue view). */
export function useProductTypes() {
    return useQuery<ProductType[]>({
        queryKey: LIST_KEY,
        queryFn: () => api.get<Envelope<ProductType[]>>(BASE).then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])),
        placeholderData: [],
        refetchOnMount: "always",
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

/** Active types only — what a provider chooses from before onboarding. */
export function useActiveProductTypes() {
    return useQuery<ProductType[]>({
        queryKey: ACTIVE_KEY,
        queryFn: () => api.get<Envelope<ProductType[]>>(`${BASE}/active`).then((r) => (Array.isArray(r.data?.data) ? r.data.data : [])),
        placeholderData: [],
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

function useInvalidate() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: LIST_KEY });
    };
}

export function useCreateProductType() {
    const done = useInvalidate();
    return useMutation({
        mutationFn: (payload: CreateProductTypePayload) => api.post<Envelope<ProductType>>(BASE, payload).then((r) => r.data.data),
        onSuccess: () => { done(); toast.success("Product type created."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not create the product type.")),
    });
}

export function useUpdateProductType() {
    const done = useInvalidate();
    return useMutation({
        mutationFn: (args: { id: string; data: UpdateProductTypePayload }) =>
            api.patch<Envelope<ProductType>>(`${BASE}/${args.id}`, args.data).then((r) => r.data.data),
        onSuccess: () => { done(); toast.success("Saved."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not save the product type.")),
    });
}

export function useReorderProductTypes() {
    const done = useInvalidate();
    return useMutation({
        mutationFn: (orderedIds: string[]) =>
            api.patch<Envelope<ProductType[]>>(`${BASE}/reorder`, { orderedIds }).then((r) => r.data.data),
        onSuccess: () => done(),
        onError: (err) => toast.error(errorToMessage(err, "Could not reorder.")),
    });
}

export function useDeleteProductType() {
    const done = useInvalidate();
    return useMutation({
        mutationFn: (id: string) => api.delete<Envelope<{ deleted: boolean }>>(`${BASE}/${id}`).then((r) => r.data.data),
        onSuccess: () => { done(); toast.success("Product type deleted."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not delete — deactivate it instead.")),
    });
}

export function useUploadProductTypeIcon() {
    const done = useInvalidate();
    return useMutation({
        mutationFn: ({ id, file }: { id: string; file: File }) => {
            const form = new FormData();
            form.append("file", file);
            return api
                .post<Envelope<ProductType>>(`${BASE}/${id}/icon`, form, { headers: { "Content-Type": "multipart/form-data" } })
                .then((r) => r.data.data);
        },
        onSuccess: () => { done(); toast.success("Icon updated."); },
        onError: (err) => toast.error(errorToMessage(err, "Icon upload failed — you can paste a URL instead.")),
    });
}
