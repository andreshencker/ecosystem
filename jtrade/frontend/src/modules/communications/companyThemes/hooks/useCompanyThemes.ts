import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type {
    CreateCompanyThemeDto,
    UpdateCompanyThemeDto,
} from "../types/companyThemes.types";
import {
    createCompanyTheme,
    deleteCompanyThemeById,
    listCompanyThemes,
    updateCompanyThemeById,
} from "../api/companyThemes.api";

const COMPANY_ID = import.meta.env.VITE_SYSTEM_COMPANY_ID;

const QK = {
    list: (companyId?: string, active?: boolean) =>
        [
            "company-themes",
            companyId ?? "",
            typeof active === "boolean" ? String(active) : "all",
        ] as const,
};

export function useCompanyThemes(params?: { active?: boolean }) {
    return useQuery({
        queryKey: QK.list(COMPANY_ID, params?.active),
        queryFn: () =>
            listCompanyThemes({
                companyId: COMPANY_ID,
                active: params?.active,
            }),
        enabled: !!COMPANY_ID,
        staleTime: 1000 * 60 * 5,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

export function useCreateCompanyTheme() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateCompanyThemeDto) => createCompanyTheme(dto),
        onSuccess: async () => {
            toast.success("Theme created successfully.");
            await qc.invalidateQueries({ queryKey: ["company-themes"] });
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.message?.[0] ||
                error?.response?.data?.message ||
                error?.message ||
                "Could not create theme.";
            toast.error(message);
        },
    });
}

export function useUpdateCompanyTheme() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
                         id,
                         data,
                     }: {
            id: string;
            data: UpdateCompanyThemeDto;
        }) => updateCompanyThemeById(id, data),
        onSuccess: async () => {
            toast.success("Theme updated successfully.");
            await qc.invalidateQueries({ queryKey: ["company-themes"] });
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.message?.[0] ||
                error?.response?.data?.message ||
                error?.message ||
                "Could not update theme.";
            toast.error(message);
        },
    });
}

export function useDeleteCompanyTheme() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteCompanyThemeById(id),
        onSuccess: async () => {
            toast.success("Theme deleted successfully.");
            await qc.invalidateQueries({ queryKey: ["company-themes"] });
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.message?.[0] ||
                error?.response?.data?.message ||
                error?.message ||
                "Could not delete theme.";
            toast.error(message);
        },
    });
}