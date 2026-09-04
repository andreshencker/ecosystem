import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type { PricingOverviewRow, ProductPricing, ProductPricingPayload } from "@/types/products";

type Envelope<T> = { status: string; data: T };
const rootKey = ["product-pricing"] as const;

export function usePricingOverview() {
    return useQuery<PricingOverviewRow[]>({
        queryKey: [...rootKey, "overview"],
        queryFn: () => api.get<Envelope<PricingOverviewRow[]>>("/pricing").then((r) => Array.isArray(r.data?.data) ? r.data.data : []),
        placeholderData: [], refetchOnWindowFocus: false,
    });
}

export function useProductPricing(productId?: string) {
    return useQuery<ProductPricing[]>({
        queryKey: [...rootKey, productId], enabled: !!productId,
        queryFn: () => api.get<Envelope<ProductPricing[]>>(`/products/${productId}/pricing`).then((r) => r.data.data),
        placeholderData: [], refetchOnWindowFocus: false,
    });
}

function useInvalidatePricing() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: rootKey });
        // Pricing changes move commercial readiness — keep the onboarding wizard fresh.
        qc.invalidateQueries({ queryKey: ["product-onboarding"] });
    };
}

export function useCreateProductPricing(productId: string) {
    const invalidate = useInvalidatePricing();
    return useMutation({
        mutationFn: (payload: ProductPricingPayload) => api.post<Envelope<ProductPricing>>(`/products/${productId}/pricing`, payload).then((r) => r.data.data),
        onSuccess: () => { invalidate(); toast.success("Pricing option created."); },
        onError: (error) => toast.error(errorToMessage(error, "Could not create the pricing option.")),
    });
}

export function useUpdateProductPricing(productId: string) {
    const invalidate = useInvalidatePricing();
    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: Partial<ProductPricingPayload> }) =>
            api.patch<Envelope<ProductPricing>>(`/products/${productId}/pricing/${id}`, data).then((r) => r.data.data),
        onSuccess: () => { invalidate(); toast.success("Pricing option updated."); },
        onError: (error) => toast.error(errorToMessage(error, "Could not update the pricing option.")),
    });
}

export function useDeactivateProductPricing(productId: string) {
    const invalidate = useInvalidatePricing();
    return useMutation({
        mutationFn: (id: string) => api.delete<Envelope<ProductPricing>>(`/products/${productId}/pricing/${id}`).then((r) => r.data.data),
        onSuccess: () => { invalidate(); toast.success("Pricing option deactivated."); },
        onError: (error) => toast.error(errorToMessage(error, "Could not deactivate the pricing option.")),
    });
}
