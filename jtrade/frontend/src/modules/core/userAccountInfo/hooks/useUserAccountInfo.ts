import { useMutation, useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

import type {
    CreateUserAccountInfoDto,
    IndicatorProjectOption,
    UpdateUserAccountInfoDto,
    UserProjectPlatformOption,
} from "../types/userAccountInfo";

import {
    createMyUserAccountInfo,
    deleteMyUserAccountInfo,
    listMyUserAccountInfos,
    updateMyUserAccountInfo,
} from "../api/userAccountInfo.api";

import { listMyUserProjectPlatforms } from "@/modules/core/userProjectPlatforms/api/userProjectPlatforms";
import { listAvailableIndicatorProjects } from "@/modules/core/indicatorProjects/api/indicatorProjects.api";

const QK = {
    list: () => ["user-account-info", "mine"] as const,

    userProjectPlatforms: () =>
        ["user-project-platforms", "mine", "account-info-options"] as const,

    indicatorProjects: () =>
        ["indicator-projects", "available", "account-info-options"] as const,
};

export function useMyUserAccountInfos() {
    return useQuery({
        queryKey: QK.list(),
        queryFn: listMyUserAccountInfos,
        retry: false,
    });
}

export function useUserProjectPlatformOptions() {
    return useQuery({
        queryKey: QK.userProjectPlatforms(),
        queryFn: async (): Promise<UserProjectPlatformOption[]> => {
            const list = await listMyUserProjectPlatforms();

            return (list ?? []).map((item: any) => {
                const pcp = item.projectCodePlatform;
                const codeProject = pcp?.codeProject;
                const typeProject = codeProject?.typeProject;
                const platform = pcp?.platform;

                const companyProvider =
                    pcp?.companyProvider ??
                    codeProject?.companyProvider ??
                    codeProject?.companyProviderId;

                const companyName =
                    companyProvider?.companyName ?? "Provider";

                const projectName = codeProject?.name ?? "Project";
                const platformName = platform?.name ?? "Platform";
                const runtimeMode = pcp?.runtimeMode ?? "-";

                return {
                    id: item.id ?? item._id,
                    label: `${projectName} / by ${companyName}`,
                    imageUrl: platform?.imageUrl,
                    meta: {
                        companyName,

                        projectName,
                        projectKey: codeProject?.projectKey,

                        typeProjectKey: typeProject?.key,
                        typeProjectName: typeProject?.name,

                        platformName,
                        runtimeMode,
                        status: pcp?.status,

                        isActive:
                            item.isActive !== false &&
                            pcp?.isActive !== false,
                    },
                };
            });
        },
        staleTime: 60_000,
        retry: false,
    });
}

export function useIndicatorProjectOptions() {
    return useQuery({
        queryKey: QK.indicatorProjects(),
        queryFn: async (): Promise<IndicatorProjectOption[]> => {
            const list = await listAvailableIndicatorProjects();

            return (list ?? []).map((item: any) => {
                const pcp = item.projectCodePlatform;
                const codeProject = pcp?.codeProject;
                const platform = pcp?.platform;
                const indicator = item.indicator;

                const companyProvider =
                    item.companyProvider ??
                    pcp?.companyProvider ??
                    codeProject?.companyProvider ??
                    codeProject?.companyProviderId;

                const companyName =
                    companyProvider?.companyName ?? "Provider";

                const projectName = codeProject?.name ?? "Project";
                const platformName = platform?.name ?? "Platform";

                const indicatorName =
                    indicator?.name ?? indicator?.key ?? "Indicator";

                const runtimeMode = pcp?.runtimeMode ?? "-";

                return {
                    id: item.id ?? item._id,
                    label: `${projectName} / by ${companyName} - ${indicatorName}`,
                    meta: {
                        companyName,

                        indicatorName,
                        indicatorKey: indicator?.key,

                        projectName,
                        projectKey: codeProject?.projectKey,

                        platformName,
                        runtimeMode,

                        isActive: item.isActive !== false,
                    },
                };
            });
        },
        staleTime: 60_000,
        retry: false,
    });
}

export function useCreateMyUserAccountInfo() {
    return useMutation({
        mutationFn: (dto: CreateUserAccountInfoDto) =>
            createMyUserAccountInfo(dto),

        onSuccess: () => {
            toast.success("Account info created");
        },

        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message?.join?.(", ") ??
                error?.response?.data?.message ??
                error?.message ??
                "Failed to create account info",
            );
        },
    });
}

export function useUpdateMyUserAccountInfo() {
    return useMutation({
        mutationFn: (args: {
            id: string;
            dto: UpdateUserAccountInfoDto;
        }) => updateMyUserAccountInfo(args.id, args.dto),

        onSuccess: () => {
            toast.success("Account info updated");
        },

        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message?.join?.(", ") ??
                error?.response?.data?.message ??
                error?.message ??
                "Failed to update account info",
            );
        },
    });
}

export function useDeleteMyUserAccountInfo() {
    return useMutation({
        mutationFn: (id: string) => deleteMyUserAccountInfo(id),

        onSuccess: () => {
            toast.success("Account info deleted");
        },

        onError: (error: any) => {
            toast.error(
                error?.response?.data?.message?.join?.(", ") ??
                error?.response?.data?.message ??
                error?.message ??
                "Failed to delete account info",
            );
        },
    });
}