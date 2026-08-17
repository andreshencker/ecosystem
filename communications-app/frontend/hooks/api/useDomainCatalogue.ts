'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { DomainCatalogue, ChannelToUse } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DomainCatalogueParams {
  active?: boolean;
  limit?: number;
  offset?: number;
}

interface BackendPage<T> { data: T[]; total: number; limit: number; offset: number; }

export interface DomainCataloguePaginatedResponse {
  items: DomainCatalogue[];
  total: number;
}

export interface CreateDomainCatalogueDto {
  companyId: string;
  domainKey: string;
  displayName: string;
  domainCategory: string;
  channelsToUse?: ChannelToUse[];
}

export type UpdateDomainCatalogueDto = Partial<Omit<CreateDomainCatalogueDto, 'companyId'>> & { isActive?: boolean };

export interface UpdateDomainCredentialsDto {
  providerCredentialsId: string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useDomainCatalogues(
  companyId: string | null | undefined,
  params: DomainCatalogueParams = {},
) {
  return useQuery({
    queryKey: ['domain-catalogue', companyId, params],
    queryFn: () =>
      apiClient
        .get<BackendPage<DomainCatalogue>>('/domain-catalogue', {
          params: { companyId, ...params },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    enabled: Boolean(companyId),
  });
}

export function useDomainCatalogue(id: string | null | undefined) {
  return useQuery({
    queryKey: ['domain-catalogue', id],
    queryFn: () =>
      apiClient.get<DomainCatalogue>(`/domain-catalogue/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateDomainCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateDomainCatalogueDto) =>
      apiClient.post<DomainCatalogue>('/domain-catalogue', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Domain created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create domain') }),
  });
}

export function useUpdateDomainCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateDomainCatalogueDto) =>
      apiClient.patch<DomainCatalogue>(`/domain-catalogue/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Domain updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update domain') }),
  });
}

export function useDeleteDomainCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/domain-catalogue/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Domain deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete domain') }),
  });
}

export function useBulkUpdateDomainCredentialsMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({
      companyId,
      domainIds,
      channel,
      providerCredentialsId,
    }: {
      companyId: string;
      domainIds: string[];
      channel: string;
      providerCredentialsId: string;
    }) =>
      apiClient
        .patch('/domain-catalogue/bulk/credentials', { companyId, domainIds, channel, providerCredentialsId })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Bulk credentials updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to bulk update credentials') }),
  });
}

export function useUpdateDomainCredentialsMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({
      id,
      channel,
      providerCredentialsId,
    }: {
      id: string;
      channel: string;
      providerCredentialsId: string;
    }) =>
      apiClient
        .patch(`/domain-catalogue/${id}/credentials/${channel}`, { providerCredentialsId })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Domain credentials updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update domain credentials') }),
  });
}
