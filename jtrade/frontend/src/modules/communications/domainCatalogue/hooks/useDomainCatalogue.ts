import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    bulkUpdateDomainCredentials,
    createDomainCatalogue,
    deleteDomainCatalogue,
    getDomainCredentials,
    listDomainCatalogue,
    updateDomainCatalogue,
    updateDomainCredential,
} from "../api/domainCatalogue.api";

import type {
    CreateDomainCatalogueDto,
    DomainChannel,
    UpdateDomainCatalogueDto,
} from "../types/domainCatalogue.types";

const COMPANY_ID = import.meta.env.VITE_SYSTEM_COMPANY_ID;

export function useDomainCatalogue(params?: { active?: boolean }) {
    return useQuery({
        queryKey: [
            "domain-catalogue",
            COMPANY_ID,
            typeof params?.active === "boolean" ? String(params.active) : "all",
        ],
        queryFn: () =>
            listDomainCatalogue({
                companyId: COMPANY_ID,
                active: params?.active,
            }),
        enabled: !!COMPANY_ID,
        refetchOnWindowFocus: false,
    });
}

export function useDomainCredentials(domainId?: string) {
    return useQuery({
        queryKey: ["domain-catalogue-credentials", domainId ?? ""],
        queryFn: () => getDomainCredentials(domainId as string),
        enabled: !!domainId,
    });
}

export function useCreateDomainCatalogue() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateDomainCatalogueDto) => createDomainCatalogue(dto),
        onSuccess: async () => {
            toast.success("Domain created.");
            await qc.invalidateQueries({ queryKey: ["domain-catalogue"] });
        },
        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Could not create domain."
            );
        },
    });
}

export function useUpdateDomainCatalogue() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
                         id,
                         data,
                     }: {
            id: string;
            data: UpdateDomainCatalogueDto;
        }) => updateDomainCatalogue(id, data),
        onSuccess: async () => {
            toast.success("Domain updated.");
            await qc.invalidateQueries({ queryKey: ["domain-catalogue"] });
        },
        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Could not update domain."
            );
        },
    });
}

export function useDeleteDomainCatalogue() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteDomainCatalogue(id),
        onSuccess: async () => {
            toast.success("Domain deleted.");
            await qc.invalidateQueries({ queryKey: ["domain-catalogue"] });
        },
        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Could not delete domain."
            );
        },
    });
}

export function useUpdateDomainCredential() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (params: {
            id: string;
            channel: DomainChannel;
            providerCredentialsId: string;
        }) => updateDomainCredential(params),
        onSuccess: async (_data, vars) => {
            toast.success("Credential updated.");
            await qc.invalidateQueries({
                queryKey: ["domain-catalogue-credentials", vars.id],
            });
            await qc.invalidateQueries({ queryKey: ["domain-catalogue"] });
        },
    });
}

export function useBulkUpdateDomainCredentials() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: bulkUpdateDomainCredentials,
        onSuccess: async () => {
            toast.success("Credentials updated.");
            await qc.invalidateQueries({ queryKey: ["domain-catalogue"] });
        },
    });
}

export { COMPANY_ID };