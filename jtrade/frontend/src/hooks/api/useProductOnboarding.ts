import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type { ProductOnboardingResponse } from "@/types/products";

type Envelope<T> = { status: string; data: T };

const key = (id: string) => ["product-onboarding", id];

/** GET /products/:id/onboarding — product + pricing + readiness + progress. */
export function useProductOnboarding(productId: string | null) {
    return useQuery<ProductOnboardingResponse>({
        queryKey: key(productId ?? "none"),
        enabled: !!productId,
        queryFn: () =>
            api
                .get<Envelope<ProductOnboardingResponse>>(`/products/${productId}/onboarding`)
                .then((r) => r.data.data),
        refetchOnWindowFocus: false,
        staleTime: 0,
    });
}

function useInvalidate(productId: string | null) {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: key(productId ?? "none") });
        qc.invalidateQueries({ queryKey: ["products", "mine"] });
        qc.invalidateQueries({ queryKey: ["product-pricing", productId] });
    };
}

/** PATCH /products/:id/onboarding/progress — wizard UX state only. */
export function useSaveOnboardingProgress(productId: string | null) {
    const done = useInvalidate(productId);
    return useMutation({
        mutationFn: (body: { currentStep?: number; visitedSteps?: number[] }) =>
            api
                .patch<Envelope<ProductOnboardingResponse>>(`/products/${productId}/onboarding/progress`, body)
                .then((r) => r.data.data),
        onSuccess: () => done(),
        onError: (err) => toast.error(errorToMessage(err, "Could not save progress.")),
    });
}

/** POST /products/:id/onboarding/complete — confirm commercial readiness. */
export function useCompleteOnboarding(productId: string | null) {
    const done = useInvalidate(productId);
    return useMutation({
        mutationFn: () =>
            api
                .post<Envelope<ProductOnboardingResponse>>(`/products/${productId}/onboarding/complete`, {})
                .then((r) => r.data.data),
        onSuccess: () => {
            done();
            toast.success("Product is commercially ready.");
        },
        onError: (err) => toast.error(errorToMessage(err, "Product is not commercially ready yet.")),
    });
}
