import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";

import {
    createTypeProject,
    deactivateTypeProject,
    getTypeProjectById,
    listActiveTypeProjects,
    listTypeProjects,
    seedTypeProjects,
    updateTypeProject,
} from "../api/typeProjects";

import type {
    CreateTypeProjectDto,
    UpdateTypeProjectDto,
} from "../types/typeProject";

const QK = {
    typeProjects: () => ["type-projects"] as const,
    activeTypeProjects: () => ["type-projects", "active"] as const,
    typeProjectById: (id: string) => ["type-projects", id] as const,
};

export function useTypeProjects() {
    return useQuery({
        queryKey: QK.typeProjects(),
        queryFn: listTypeProjects,
        staleTime: 15_000,
    });
}

export function useActiveTypeProjects() {
    return useQuery({
        queryKey: QK.activeTypeProjects(),
        queryFn: listActiveTypeProjects,
        staleTime: 30_000,
    });
}

export function useTypeProjectById(id?: string) {
    return useQuery({
        queryKey: QK.typeProjectById(id ?? ""),
        queryFn: () => getTypeProjectById(id!),
        enabled: !!id,
        staleTime: 15_000,
    });
}

export function useCreateTypeProject() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (dto: CreateTypeProjectDto) => createTypeProject(dto),
        onSuccess: async () => {
            toast.success("Type project created");

            await qc.invalidateQueries({ queryKey: QK.typeProjects() });
            await qc.invalidateQueries({ queryKey: QK.activeTypeProjects() });
        },
        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to create type project",
            );
        },
    });
}

export function useUpdateTypeProject() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: ({
                         id,
                         dto,
                     }: {
            id: string;
            dto: UpdateTypeProjectDto;
        }) => updateTypeProject(id, dto),
        onSuccess: async () => {
            toast.success("Type project updated");

            await qc.invalidateQueries({ queryKey: QK.typeProjects() });
            await qc.invalidateQueries({ queryKey: QK.activeTypeProjects() });
        },
        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to update type project",
            );
        },
    });
}

export function useDeactivateTypeProject() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => deactivateTypeProject(id),
        onSuccess: async () => {
            toast.success("Type project deactivated");

            await qc.invalidateQueries({ queryKey: QK.typeProjects() });
            await qc.invalidateQueries({ queryKey: QK.activeTypeProjects() });
        },
        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to deactivate type project",
            );
        },
    });
}

export function useSeedTypeProjects() {
    const qc = useQueryClient();

    return useMutation({
        mutationFn: seedTypeProjects,
        onSuccess: async (res) => {
            toast.success(`Default types ready (${res.count} created)`);

            await qc.invalidateQueries({ queryKey: QK.typeProjects() });
            await qc.invalidateQueries({ queryKey: QK.activeTypeProjects() });
        },
        onError: (e: any) => {
            toast.error(
                e?.response?.data?.message ??
                e?.message ??
                "Failed to seed type projects",
            );
        },
    });
}