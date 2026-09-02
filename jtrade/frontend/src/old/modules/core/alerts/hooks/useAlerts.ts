import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type {
    CreateAlertDto,
    IndicatorProjectOption,
    QueryAlerts,
    QueryAlertGroups,
    SymbolOption,
    UpdateAlertDto,
} from "../types/alerts";

import {
    createAlert,
    deleteAlert,
    listAlerts,
    listAlertGroups,
    updateAlert,
} from "../api/alerts.api";

import { listMyIndicatorProjects } from "@/old/modules/core/indicatorProjects/api/indicatorProjects.api";
import { listSymbols } from "@/old/modules/core/symbols/api/symbols.api";

const alertsKey = (query?: QueryAlerts) => ["alerts", query ?? {}] as const;

const alertGroupsKey = (query?: QueryAlertGroups) =>
    ["alert-groups", query ?? {}] as const;

const indicatorProjectsKey = () =>
    ["indicator-projects", "options", "alerts"] as const;

const symbolsKey = () => ["symbols", "options", "alerts"] as const;

export function useAlerts(query?: QueryAlerts) {
    return useQuery({
        queryKey: alertsKey(query),
        queryFn: () => listAlerts(query),
        retry: false,
    });
}

export function useAlertGroups(query?: QueryAlertGroups) {
    return useQuery({
        queryKey: alertGroupsKey(query),
        queryFn: () => listAlertGroups(query),
        retry: false,
    });
}

export function useIndicatorProjectOptions() {
    return useQuery({
        queryKey: indicatorProjectsKey(),
        queryFn: async (): Promise<IndicatorProjectOption[]> => {
            const list = await listMyIndicatorProjects();

            return (list ?? []).map((item: any) => {
                const pcp = item.projectCodePlatform;
                const indicator = item.indicator;

                const projectName = pcp?.codeProject?.name ?? "Project";
                const platformName = pcp?.platform?.name ?? "Platform";
                const indicatorName =
                    indicator?.name ?? indicator?.key ?? "Indicator";

                return {
                    id: item.id ?? item._id,
                    name: `${projectName} / ${platformName} - ${indicatorName}`,
                    indicatorName,
                    indicatorKey: indicator?.key,
                    projectName,
                    platformName,
                    runtimeMode: pcp?.runtimeMode,
                    isActive: item.isActive,
                };
            });
        },
        staleTime: 60_000,
        retry: false,
    });
}

export function useSymbolOptions() {
    return useQuery({
        queryKey: symbolsKey(),
        queryFn: async (): Promise<SymbolOption[]> => {
            const list = await listSymbols();

            return (list ?? []).map((item: any) => ({
                id: item.id ?? item._id,
                symbol: item.symbol,
                isActive: item.isActive,
            }));
        },
        staleTime: 60_000,
        retry: false,
    });
}

export function useCreateAlert() {
    return useMutation({
        mutationFn: (dto: CreateAlertDto) => createAlert(dto),
        onSuccess: () => toast.success("Alert pair created (BUY + SELL)"),
        onError: (e: any) =>
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create alert pair",
            ),
    });
}

export function useUpdateAlert() {
    return useMutation({
        mutationFn: (params: { id: string; data: UpdateAlertDto }) =>
            updateAlert(params.id, params.data),
        onSuccess: () => toast.success("Alert pair updated"),
        onError: (e: any) =>
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update alert pair",
            ),
    });
}

export function useDeleteAlert() {
    return useMutation({
        mutationFn: (id: string) => deleteAlert(id),
        onSuccess: () => toast.success("Alert pair deleted"),
        onError: (e: any) =>
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to delete alert pair",
            ),
    });
}