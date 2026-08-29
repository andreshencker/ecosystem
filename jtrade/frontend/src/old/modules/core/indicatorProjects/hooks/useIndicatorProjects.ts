import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type {
    CreateIndicatorProjectDto,
    ListIndicatorProjectsParams,
    UpdateIndicatorProjectDto,
} from "../types/indicatorProjects";

import {
    createMyIndicatorProject,
    deactivateIndicatorProject,
    getIndicatorProjectById,
    getMyIndicatorProjectById,
    listAvailableIndicatorProjects,
    listIndicatorProjects,
    listMyIndicatorProjects,
    removeMyIndicatorProject,
    updateMyIndicatorProject,
} from "../api/indicatorProjects.api";

const QK = {
    adminList: (params?: ListIndicatorProjectsParams) =>
        [
            "indicator-projects",
            "admin",
            params?.companyProviderId ?? "all",
            params?.projectCodePlatformId ?? "all",
            params?.indicatorId ?? "all",
            params?.isActive ?? "all",
        ] as const,

    adminDetail: (id?: string) =>
        ["indicator-projects", "admin", "detail", id ?? ""] as const,

    myList: () => ["indicator-projects", "my"] as const,

    myDetail: (id?: string) =>
        ["indicator-projects", "my", "detail", id ?? ""] as const,

    availableList: () => ["indicator-projects", "available"] as const,
};

export function useIndicatorProjects(params?: ListIndicatorProjectsParams) {
    return useQuery({
        queryKey: QK.adminList(params),
        queryFn: () => listIndicatorProjects(params),
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 0,
    });
}

export function useIndicatorProjectById(id?: string) {
    return useQuery({
        queryKey: QK.adminDetail(id),
        queryFn: () => getIndicatorProjectById(id!),
        enabled: !!id,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

export function useMyIndicatorProjects() {
    return useQuery({
        queryKey: QK.myList(),
        queryFn: listMyIndicatorProjects,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 0,
    });
}

export function useMyIndicatorProjectById(id?: string) {
    return useQuery({
        queryKey: QK.myDetail(id),
        queryFn: () => getMyIndicatorProjectById(id!),
        enabled: !!id,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
    });
}

export function useAvailableIndicatorProjects() {
    return useQuery({
        queryKey: QK.availableList(),
        queryFn: listAvailableIndicatorProjects,
        retry: false,
        refetchOnWindowFocus: false,
        refetchOnReconnect: false,
        staleTime: 0,
    });
}

export function useCreateMyIndicatorProject() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateIndicatorProjectDto) =>
            createMyIndicatorProject(dto),

        onSuccess: async () => {
            toast.success("Indicator project created");

            await qc.invalidateQueries({
                queryKey: ["indicator-projects"],
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create indicator project",
            );
        },
    });
}

export function useUpdateMyIndicatorProject() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (args: {
            id: string;
            data: UpdateIndicatorProjectDto;
        }) => updateMyIndicatorProject(args.id, args.data),

        onSuccess: async () => {
            toast.success("Indicator project updated");

            await qc.invalidateQueries({
                queryKey: ["indicator-projects"],
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update indicator project",
            );
        },
    });
}

export function useRemoveMyIndicatorProject() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => removeMyIndicatorProject(id),

        onSuccess: async () => {
            toast.success("Indicator project deleted");

            await qc.invalidateQueries({
                queryKey: ["indicator-projects"],
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to delete indicator project",
            );
        },
    });
}

export function useDeactivateIndicatorProject() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deactivateIndicatorProject(id),

        onSuccess: async () => {
            toast.success("Indicator project deactivated");

            await qc.invalidateQueries({
                queryKey: ["indicator-projects"],
            });
        },

        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to deactivate indicator project",
            );
        },
    });
}