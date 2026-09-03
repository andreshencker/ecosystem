import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type {
    PaymentsOnboardingStatus,
    StartMethodResult,
} from "@/types/payments-onboarding";

type Envelope<T> = { status: string; data: T };

const BASE = "/onboarding/payments";
const KEY = ["onboarding", "payments"];

export function usePaymentsOnboardingStatus() {
    return useQuery<PaymentsOnboardingStatus>({
        queryKey: KEY,
        queryFn: () =>
            api
                .get<Envelope<PaymentsOnboardingStatus>>(BASE)
                .then((r) => r.data.data),
        refetchOnWindowFocus: false,
        staleTime: 0,
    });
}

export interface StartMethodArgs {
    method: string;
    country?: string;
    businessName?: string;
}

/** Starts (or resumes) a method's configuration and returns the URL to redirect to. */
export function useStartPaymentMethod() {
    return useMutation<StartMethodResult, unknown, StartMethodArgs>({
        mutationFn: ({ method, ...body }: StartMethodArgs) =>
            api
                .post<Envelope<StartMethodResult>>(
                    `${BASE}/methods/${method}/start`,
                    body,
                )
                .then((r) => r.data.data),
        onError: (err) =>
            toast.error(errorToMessage(err, "Could not start the configuration.")),
    });
}

/** Re-checks a method's state against the gateway (via Relay). */
export function useRefreshPaymentMethod() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (method: string) =>
            api
                .post<Envelope<unknown>>(`${BASE}/methods/${method}/refresh`, {})
                .then((r) => r.data.data),
        onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
        onError: (err) =>
            toast.error(errorToMessage(err, "Could not refresh the status.")),
    });
}
