import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    listLayoutTemplates,
    createLayoutTemplate,
    updateLayoutTemplate,
    deleteLayoutTemplate,
} from "../api/layoutTemplates.api";

import type {
    CreateLayoutTemplateDto,
    UpdateLayoutTemplateDto,
} from "../types/layoutTemplates.types";

const COMPANY_ID = import.meta.env.VITE_SYSTEM_COMPANY_ID;

export function useLayoutTemplates() {
    return useQuery({
        queryKey: ["layout-templates", COMPANY_ID],
        queryFn: () => listLayoutTemplates(COMPANY_ID),
        enabled: !!COMPANY_ID,
        refetchOnWindowFocus: false,
    });
}

export function useCreateLayoutTemplate() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateLayoutTemplateDto) => createLayoutTemplate(dto),
        onSuccess: async () => {
            toast.success("Template created.");
            await qc.invalidateQueries({ queryKey: ["layout-templates"] });
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.message?.[0] ||
                error?.response?.data?.message ||
                error?.message ||
                "Could not create template.";
            toast.error(message);
        },
    });
}

export function useUpdateLayoutTemplate() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
                         id,
                         data,
                     }: {
            id: string;
            data: UpdateLayoutTemplateDto;
        }) => updateLayoutTemplate(id, data),
        onSuccess: async () => {
            toast.success("Template updated.");
            await qc.invalidateQueries({ queryKey: ["layout-templates"] });
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.message?.[0] ||
                error?.response?.data?.message ||
                error?.message ||
                "Could not update template.";
            toast.error(message);
        },
    });
}

export function useDeleteLayoutTemplate() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteLayoutTemplate(id),
        onSuccess: async () => {
            toast.success("Template deleted.");
            await qc.invalidateQueries({ queryKey: ["layout-templates"] });
        },
        onError: (error: any) => {
            const message =
                error?.response?.data?.message?.[0] ||
                error?.response?.data?.message ||
                error?.message ||
                "Could not delete template.";
            toast.error(message);
        },
    });
}