'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { Provider } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformProviderParams {
  limit?: number;
  offset?: number;
  channelId?: string;
  active?: boolean;
}

interface BackendPage<T> { data: T[]; total: number; limit: number; offset: number; }

export interface PlatformProvidersPaginatedResponse {
  items: Provider[];
  total: number;
}

export interface CreateProviderDto {
  providerKey: string;
  displayName: string;
  description?: string;
  channelId: string;
  connectionType: 'api_key' | 'smtp' | 'oauth' | 'access_keys' | 'token';
  isActive?: boolean;
}

export interface UpdateProviderDto {
  displayName?: string;
  description?: string;
  channelId?: string;
  isActive?: boolean;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePlatformProviders(params: PlatformProviderParams = {}) {
  const { limit = 100, offset = 0, ...rest } = params;
  return useQuery({
    queryKey: ['modules-providers', { limit, offset, ...rest }],
    queryFn: () =>
      apiClient
        .get<BackendPage<Provider>>('/providers', {
          params: { limit, offset, populate: true, ...rest },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    staleTime: 2 * 60 * 1_000,
  });
}

export function usePlatformProvider(id: string | null | undefined) {
  return useQuery({
    queryKey: ['modules-providers', id],
    queryFn: () =>
      apiClient.get<Provider>(`/providers/${id}`).then((r) => r.data),
    enabled: Boolean(id),
    staleTime: 2 * 60 * 1_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateProviderMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateProviderDto) =>
      apiClient.post<Provider>('/providers', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules-providers'] });
      qc.invalidateQueries({ queryKey: ['providers'] });
      pushSnack({ type: 'success', message: 'Provider created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create provider') }),
  });
}

export function useUpdateProviderMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateProviderDto) =>
      apiClient.patch<Provider>(`/providers/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules-providers'] });
      qc.invalidateQueries({ queryKey: ['providers'] });
      pushSnack({ type: 'success', message: 'Provider updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update provider') }),
  });
}

export function useDeleteProviderMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/providers/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules-providers'] });
      qc.invalidateQueries({ queryKey: ['providers'] });
      pushSnack({ type: 'success', message: 'Provider deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete provider') }),
  });
}
