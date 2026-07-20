import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    createMyCompanyProvider,
    deactivateCompanyProvider,
    getCompanyProviderById,
    getMyCompanyProvider,
    listCompanyProviders,
    updateMyCompanyProvider,
} from "../api/companyProviders";

import type {
    CreateCompanyProviderDto,
    UpdateCompanyProviderDto,
} from "../types/companyProvider";

const QK = {
    myCompanyProvider: () => ["company-providers", "me"] as const,
    companyProviders: () => ["company-providers"] as const,
    companyProviderById: (id: string) => ["company-providers", id] as const,
};

export function useMyCompanyProvider(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: QK.myCompanyProvider(),
        queryFn: getMyCompanyProvider,
        enabled: options?.enabled ?? true,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        staleTime: 30_000,
    });
}

export function useCreateMyCompanyProvider() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateCompanyProviderDto) =>
            createMyCompanyProvider(dto),

        onSuccess: async (created) => {
            toast.success("Company created");

            qc.setQueryData(QK.myCompanyProvider(), created);

            await qc.invalidateQueries({
                queryKey: QK.companyProviders(),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create company",
            );
        },
    });
}

export function useUpdateMyCompanyProvider() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: UpdateCompanyProviderDto) =>
            updateMyCompanyProvider(dto),

        onSuccess: async (updated) => {
            toast.success("Company updated");

            qc.setQueryData(QK.myCompanyProvider(), updated);

            await qc.invalidateQueries({
                queryKey: QK.companyProviders(),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update company",
            );
        },
    });
}

export function useCompanyProviders(options?: { enabled?: boolean }) {
    return useQuery({
        queryKey: QK.companyProviders(),
        queryFn: listCompanyProviders,
        enabled: options?.enabled ?? true,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        staleTime: 15_000,
    });
}

export function useCompanyProviderById(
    id?: string,
    options?: { enabled?: boolean },
) {
    return useQuery({
        queryKey: QK.companyProviderById(id ?? ""),
        queryFn: () => getCompanyProviderById(id!),
        enabled: !!id && (options?.enabled ?? true),
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        refetchOnMount: false,
        staleTime: 15_000,
    });
}

export function useDeactivateCompanyProvider() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deactivateCompanyProvider(id),

        onSuccess: async () => {
            toast.success("Company deactivated");

            await qc.invalidateQueries({
                queryKey: QK.companyProviders(),
            });

            await qc.invalidateQueries({
                queryKey: QK.myCompanyProvider(),
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to deactivate company",
            );
        },
    });
}