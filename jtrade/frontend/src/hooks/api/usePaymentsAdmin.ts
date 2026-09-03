import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type {
    AdminPaymentMethod,
    UpsertMethodConfigPayload,
} from "@/types/payments-admin";

type Envelope<T> = { status: string; data: T };

const BASE = "/admin/payments";
const KEY = ["admin", "payments", "methods"];

export function useAdminPaymentMethods() {
    return useQuery<AdminPaymentMethod[]>({
        queryKey: KEY,
        queryFn: () =>
            api
                .get<Envelope<AdminPaymentMethod[]>>(`${BASE}/methods`)
                .then((r) => r.data.data),
        refetchOnWindowFocus: false,
        staleTime: 0,
    });
}

export function useUpsertPaymentMethod() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (a: { method: string; body: UpsertMethodConfigPayload }) =>
            api
                .put<Envelope<AdminPaymentMethod>>(
                    `${BASE}/methods/${a.method}`,
                    a.body,
                )
                .then((r) => r.data.data),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: KEY });
            toast.success("Saved.");
        },
        onError: (err) =>
            toast.error(errorToMessage(err, "Could not save the payment method.")),
    });
}
