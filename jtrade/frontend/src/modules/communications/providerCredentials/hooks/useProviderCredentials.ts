import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    createProviderCredentials,
    deleteProviderCredentials,
    getProviderCredentialById,
    listProviderCredentialOptions,
    listProviderCredentials,
    updateProviderCredentials,
} from "../api/providerCredentials.api";

import type {
    CreateProviderCredentialsDto,
    ProviderCredentialChannel,
    UpdateProviderCredentialsDto,
} from "../types/providerCredentials.types";

export const PROVIDER_CREDENTIALS_QK = {
    all: ["provider-credentials"] as const,

    list: (params: {
        companyChannelProviderId?: string;
        active?: boolean;
        populate?: boolean;
    }) =>
        [
            "provider-credentials",
            "list",
            params.companyChannelProviderId ?? "",
            typeof params.active === "boolean" ? String(params.active) : "all",
            typeof params.populate === "boolean" ? String(params.populate) : "default",
        ] as const,

    detail: (id?: string) =>
        ["provider-credentials", "detail", id ?? ""] as const,

    options: (params: {
        companyId?: string;
        channel?: ProviderCredentialChannel;
        active?: boolean;
    }) =>
        [
            "provider-credentials",
            "options",
            params.companyId ?? "",
            params.channel ?? "all",
            typeof params.active === "boolean" ? String(params.active) : "all",
        ] as const,
};

export function useProviderCredentials(params: {
    companyChannelProviderId?: string;
    active?: boolean;
    populate?: boolean;
}) {
    return useQuery({
        queryKey: PROVIDER_CREDENTIALS_QK.list(params),
        queryFn: () =>
            listProviderCredentials({
                companyChannelProviderId: params.companyChannelProviderId as string,
                active: params.active,
                populate: params.populate,
            }),
        enabled: !!params.companyChannelProviderId,
        refetchOnWindowFocus: false,
    });
}

export function useProviderCredential(id?: string, params?: { populate?: boolean }) {
    return useQuery({
        queryKey: PROVIDER_CREDENTIALS_QK.detail(id),
        queryFn: () => getProviderCredentialById(id as string, params),
        enabled: !!id,
        refetchOnWindowFocus: false,
    });
}

export function useProviderCredentialOptions(params: {
    companyId?: string;
    channel?: ProviderCredentialChannel;
    active?: boolean;
}) {
    return useQuery({
        queryKey: PROVIDER_CREDENTIALS_QK.options(params),
        queryFn: () =>
            listProviderCredentialOptions({
                companyId: params.companyId as string,
                channel: params.channel,
                active: params.active,
            }),
        enabled: !!params.companyId,
        refetchOnWindowFocus: false,
    });
}

export function useCreateProviderCredentials() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateProviderCredentialsDto) =>
            createProviderCredentials(dto),

        onSuccess: async () => {
            toast.success("Credentials created.");
            await qc.invalidateQueries({ queryKey: PROVIDER_CREDENTIALS_QK.all });
        },

        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Could not create credentials."
            );
        },
    });
}

export function useUpdateProviderCredentials() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
                         id,
                         data,
                     }: {
            id: string;
            data: UpdateProviderCredentialsDto;
        }) => updateProviderCredentials(id, data),

        onSuccess: async () => {
            toast.success("Credentials updated.");
            await qc.invalidateQueries({ queryKey: PROVIDER_CREDENTIALS_QK.all });
        },

        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Could not update credentials."
            );
        },
    });
}

export function useDeleteProviderCredentials() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deleteProviderCredentials(id),

        onSuccess: async () => {
            toast.success("Credentials deleted.");
            await qc.invalidateQueries({ queryKey: PROVIDER_CREDENTIALS_QK.all });
        },

        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message ||
                error?.message ||
                "Could not delete credentials."
            );
        },
    });
}