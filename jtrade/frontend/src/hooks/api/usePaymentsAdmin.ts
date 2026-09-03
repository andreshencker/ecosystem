import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type {
    AdminPaymentMethod,
    AvailableMethod,
    UpsertMethodConfigPayload,
} from "@/types/payments-admin";

type Envelope<T> = { status: string; data: T };

const BASE = "/admin/payments";
const KEY = ["admin", "payments", "methods"];
const CATALOG_KEY = ["admin", "payments", "catalog"];

export function useAdminPaymentMethods() {
    return useQuery<AdminPaymentMethod[]>({
        queryKey: KEY,
        queryFn: () =>
            api.get<Envelope<AdminPaymentMethod[]>>(`${BASE}/methods`).then((r) => r.data.data),
        refetchOnWindowFocus: false,
        staleTime: 0,
    });
}

export function useAvailablePaymentMethods() {
    return useQuery<AvailableMethod[]>({
        queryKey: CATALOG_KEY,
        queryFn: () =>
            api.get<Envelope<AvailableMethod[]>>(`${BASE}/catalog`).then((r) => r.data.data),
        refetchOnWindowFocus: false,
    });
}

function useInvalidate() {
    const qc = useQueryClient();
    return () => {
        qc.invalidateQueries({ queryKey: KEY });
        qc.invalidateQueries({ queryKey: CATALOG_KEY });
    };
}

export function useAddPaymentMethod() {
    const done = useInvalidate();
    return useMutation({
        mutationFn: (method: string) =>
            api.post<Envelope<AdminPaymentMethod>>(`${BASE}/methods`, { method }).then((r) => r.data.data),
        onSuccess: () => { done(); toast.success("Method added."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not add the method.")),
    });
}

export function useUpsertPaymentMethod() {
    const done = useInvalidate();
    return useMutation({
        mutationFn: (a: { method: string; body: UpsertMethodConfigPayload }) =>
            api.put<Envelope<AdminPaymentMethod>>(`${BASE}/methods/${a.method}`, a.body).then((r) => r.data.data),
        onSuccess: () => { done(); toast.success("Saved."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not save the payment method.")),
    });
}

export function useRemovePaymentMethod() {
    const done = useInvalidate();
    return useMutation({
        mutationFn: (method: string) =>
            api.delete(`${BASE}/methods/${method}`).then((r) => r.data),
        onSuccess: () => { done(); toast.success("Method removed."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not remove the method.")),
    });
}
