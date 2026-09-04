// src/hooks/api/useIndicators.ts
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { api } from "@/lib/http";
import { errorToMessage } from "@/lib/utils";
import type { AddChannelPayload, CreateIndicatorPayload, Indicator, UpdateIndicatorPayload } from "@/types/indicator";

type Envelope<T> = { status: string; data: T };

const BASE = "/indicators";
const KEY = ["indicators"];

export function useIndicators() {
    return useQuery<Indicator[]>({
        queryKey: KEY,
        queryFn: () => api.get<Envelope<Indicator[]>>(BASE).then((r) => r.data.data),
        placeholderData: [],
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 0,
    });
}

export function useCreateIndicator() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (payload: CreateIndicatorPayload) =>
            api.post<Envelope<Indicator>>(BASE, payload).then((r) => r.data.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Indicator created."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not create the indicator.")),
    });
}

export function useUpdateIndicator() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; data: UpdateIndicatorPayload }) =>
            api.patch<Envelope<Indicator>>(`${BASE}/${args.id}`, args.data).then((r) => r.data.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Indicator updated."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not update the indicator.")),
    });
}

export function useRotateIndicatorWebhook() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) =>
            api.post<Envelope<Indicator>>(`${BASE}/${id}/webhook/rotate`).then((r) => r.data.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Webhook URL rotated."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not rotate the webhook.")),
    });
}

/**
 * Alert channel counts/enabled-state feed the Product Onboarding wizard's
 * "Alert Setup" readiness (a Signal product needs every associated indicator
 * to have >=1 enabled alert) — also invalidate that query so the wizard's
 * Stepper/Review badges refresh immediately. Mirrors the same pattern already
 * used by useProductPricing.ts's useInvalidatePricing(). A no-op on the
 * standalone Indicators/Alerts pages, which never mount that query.
 */
function invalidateAfterChannelChange(qc: ReturnType<typeof useQueryClient>) {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["product-onboarding"] });
}

export function useAddChannel() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; data: AddChannelPayload }) =>
            api.post<Envelope<Indicator>>(`${BASE}/${args.id}/channels`, args.data).then((r) => r.data.data),
        onSuccess: () => { invalidateAfterChannelChange(qc); toast.success("Alert added."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not add the alert.")),
    });
}

export function useRemoveChannel() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; channelId: string }) =>
            api.delete<Envelope<Indicator>>(`${BASE}/${args.id}/channels/${args.channelId}`).then((r) => r.data.data),
        onSuccess: () => { invalidateAfterChannelChange(qc); toast.success("Alert removed."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not remove the alert.")),
    });
}

export function useSetChannelEnabled() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; channelId: string; enabled: boolean }) =>
            api.patch<Envelope<Indicator>>(`${BASE}/${args.id}/channels/${args.channelId}`, { enabled: args.enabled }).then((r) => r.data.data),
        onSuccess: () => { invalidateAfterChannelChange(qc); },
        onError: (err) => toast.error(errorToMessage(err, "Could not update the alert.")),
    });
}

export function useRotateChannelKeys() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (args: { id: string; channelId: string }) =>
            api.post<Envelope<Indicator>>(`${BASE}/${args.id}/channels/${args.channelId}/rotate`).then((r) => r.data.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Alert keys rotated."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not rotate the keys.")),
    });
}

export function useDeleteIndicator() {
    const qc = useQueryClient();
    return useMutation({
        mutationFn: (id: string) => api.delete(`${BASE}/${id}`).then((r) => r.data),
        onSuccess: () => { qc.invalidateQueries({ queryKey: KEY }); toast.success("Indicator deleted."); },
        onError: (err) => toast.error(errorToMessage(err, "Could not delete the indicator.")),
    });
}

