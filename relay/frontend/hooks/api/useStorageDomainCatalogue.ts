'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { StorageDomainCatalogue } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StorageDomainCatalogueParams {
  active?: boolean;
  providerCredentialsId?: string;
  limit?: number;
  offset?: number;
}

interface BackendPage<T> { data: T[]; total: number; limit: number; offset: number; }

export interface CreateStorageDomainCatalogueDto {
  companyId: string;
  providerCredentialsId: string;
  domainKey: string;
  visibility: 'public' | 'private';
  displayName: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateStorageDomainCatalogueDto = Partial<Omit<CreateStorageDomainCatalogueDto, 'companyId'>> & { isActive?: boolean };

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useStorageDomainCatalogues(
  companyId: string | null | undefined,
  params: StorageDomainCatalogueParams = {},
) {
  return useQuery({
    queryKey: ['storage-domain-catalogue', companyId, params],
    queryFn: () =>
      apiClient
        .get<BackendPage<StorageDomainCatalogue>>('/storage-domain-catalogue', {
          params: { companyId, ...params },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    enabled: Boolean(companyId),
  });
}

export function useStorageDomainCatalogue(id: string | null | undefined) {
  return useQuery({
    queryKey: ['storage-domain-catalogue', id],
    queryFn: () =>
      apiClient.get<StorageDomainCatalogue>(`/storage-domain-catalogue/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateStorageDomainCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateStorageDomainCatalogueDto) =>
      apiClient.post<StorageDomainCatalogue>('/storage-domain-catalogue', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storage-domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Storage domain created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create storage domain') }),
  });
}

export function useUpdateStorageDomainCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateStorageDomainCatalogueDto) =>
      apiClient.patch<StorageDomainCatalogue>(`/storage-domain-catalogue/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storage-domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Storage domain updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update storage domain') }),
  });
}

export function useDeleteStorageDomainCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/storage-domain-catalogue/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['storage-domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Storage domain deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete storage domain') }),
  });
}
