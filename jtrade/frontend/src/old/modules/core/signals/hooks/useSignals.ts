import { useQuery } from "@tanstack/react-query";
import {
    listAdminSignals,
    listClientSignals,
} from "@/old/modules/core/signals/api/signals.api";
import type {
    AdminSignal,
    AdminSignalsParams,
    ClientSignal,
    ClientSignalsParams,
} from "@/old/modules/core/signals/types/signals";

const CLIENT_SIGNALS_KEY = (params?: ClientSignalsParams) =>
    [
        "signals",
        "client",
        params?.symbol ?? "",
        params?.timeFrame ?? "",
        params?.indicatorId ?? "",
        params?.lastHours ?? "",
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
    ] as const;

const ADMIN_SIGNALS_KEY = (params?: AdminSignalsParams) =>
    [
        "signals",
        "admin",
        params?.symbol ?? "",
        params?.timeFrame ?? "",
        params?.indicatorId ?? "",
        params?.adminIndicatorId ?? "",
        params?.lastHours ?? "",
        params?.dateFrom ?? "",
        params?.dateTo ?? "",
    ] as const;

export function useClientSignals(params?: ClientSignalsParams) {
    return useQuery<ClientSignal[]>({
        queryKey: CLIENT_SIGNALS_KEY(params),
        queryFn: () => listClientSignals(params),
        placeholderData: [],
        refetchOnWindowFocus: false,
    });
}

export function useAdminSignals(params?: AdminSignalsParams) {
    return useQuery<AdminSignal[]>({
        queryKey: ADMIN_SIGNALS_KEY(params),
        queryFn: () => listAdminSignals(params),
        placeholderData: [],
        refetchOnWindowFocus: false,
    });
}