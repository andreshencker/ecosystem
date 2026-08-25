'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { CompanyChannelProvider, Channel, Provider } from '@/types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ChannelProviderParams {
  channelId?: string;
  active?: boolean;
  isDefault?: boolean;
  populate?: boolean;
  limit?: number;
  offset?: number;
}

interface BackendPage<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ChannelProvidersPaginatedResponse {
  items: CompanyChannelProvider[];
  total: number;
}

export interface CreateChannelProviderDto {
  companyId: string;
  providerId: string;
  channelId: string;
  isDefault?: boolean;
  isActive?: boolean;
}

export interface UpdateChannelProviderDto {
  providerId?: string;
  channelId?: string;
  isDefault?: boolean;
  isActive?: boolean;
}

// ─── Catalog queries ──────────────────────────────────────────────────────────

export function useChannels() {
  return useQuery({
    queryKey: ['channels'],
    queryFn: () =>
      apiClient
        .get<BackendPage<Channel>>('/channels', { params: { limit: 100 } })
        .then((r) => r.data.data ?? []),
    staleTime: 5 * 60 * 1_000,
  });
}

export function useProviders(channelId?: string) {
  return useQuery({
    queryKey: ['providers', channelId],
    queryFn: () =>
      apiClient
        .get<BackendPage<Provider>>('/providers', {
          params: { channelId, limit: 100 },
        })
        .then((r) => r.data.data ?? []),
    enabled: Boolean(channelId),
    staleTime: 5 * 60 * 1_000,
  });
}

// ─── Company channel providers queries ───────────────────────────────────────

export function useCompanyChannelProviders(
  companyId: string | null | undefined,
  params: ChannelProviderParams = {},
) {
  return useQuery({
    queryKey: ['company-channel-providers', companyId, params],
    queryFn: () =>
      apiClient
        .get<BackendPage<CompanyChannelProvider>>('/company-channel-providers', {
          params: { companyId, populate: true, limit: 200, ...params },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    enabled: Boolean(companyId),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
// Mutations define only mutationFn.
// Success snacks + query invalidation are handled by useCrudFeedback in callers.
// Error toasts come from the global mutationCache.onError in queryClient.ts,
// unless the mutation sets meta: { suppressGlobalError: true }.

export function useCreateChannelProviderMutation() {
  return useMutation({
    // Suppress global error toast — CredentialForm (the only caller) shows
    // the specific backend message inline via setFormError.
    meta: { suppressGlobalError: true },
    mutationFn: (dto: CreateChannelProviderDto) =>
      apiClient
        .post<CompanyChannelProvider>('/company-channel-providers', dto)
        .then((r) => r.data),
  });
}

export function useUpdateChannelProviderMutation() {
  return useMutation({
    // Suppress global error toast — CredentialForm (the only caller) shows
    // the specific backend message inline via setFormError.
    meta: { suppressGlobalError: true },
    mutationFn: ({ id, ...dto }: { id: string } & UpdateChannelProviderDto) =>
      apiClient
        .patch<CompanyChannelProvider>(`/company-channel-providers/${id}`, dto)
        .then((r) => r.data),
  });
}

export function useSetDefaultChannelProviderMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient
        .patch<CompanyChannelProvider>(`/company-channel-providers/${id}`, { isDefault: true })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-channel-providers'] });
    },
  });
}

export function useDeleteChannelProviderMutation() {
  return useMutation({
    // Suppress global error toast — the page handles errors directly
    // (distinguishes 409-hasCredentials from real errors).
    meta: { suppressGlobalError: true },
    mutationFn: ({ id, force = false }: { id: string; force?: boolean }) =>
      apiClient
        .delete(`/company-channel-providers/${id}`, {
          params: force ? { force: 'true' } : undefined,
        })
        .then((r) => r.data),
  });
}
