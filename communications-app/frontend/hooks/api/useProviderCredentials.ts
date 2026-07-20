'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engineClient } from '@/lib/engine-axios';
import type { ProviderCredentials } from '@/types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

interface BackendPage<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProviderCredentialsPaginatedResponse {
  items: ProviderCredentials[];
  total: number;
}

export interface CredentialOptionItem {
  id: string;
  label: string;
  tag: string;
  companyChannelProviderId: string;
  channel: string;
  channelKey: string;
  providerKey: string;
  connectionType: string;
  isActive: boolean;
}

export interface CreateProviderCredentialsDto {
  companyChannelProviderId: string;
  tag: string;
  credentials: Record<string, unknown>;
}

export interface UpdateProviderCredentialsDto {
  tag?: string;
  credentials?: Record<string, unknown>;
  isActive?: boolean;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches all credentials for a company in a single request.
 * Always returns populated provider + channel info (no encrypted payload).
 */
export function useAllCompanyCredentials(
  companyId: string | null | undefined,
  options: { active?: boolean } = {},
) {
  return useQuery({
    queryKey: ['provider-credentials', 'company-all', companyId, options],
    queryFn: () =>
      engineClient
        .get<BackendPage<ProviderCredentials>>('/provider-credentials', {
          params: { companyId, populate: true, limit: 200, ...options },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    enabled: Boolean(companyId),
  });
}

export function useProviderCredentials(
  companyChannelProviderId: string | null | undefined,
  options: { active?: boolean; populate?: boolean } = {},
) {
  return useQuery({
    queryKey: ['provider-credentials', companyChannelProviderId, options],
    queryFn: () =>
      engineClient
        .get<BackendPage<ProviderCredentials>>('/provider-credentials', {
          params: { companyChannelProviderId, ...options },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    enabled: Boolean(companyChannelProviderId),
  });
}

export function useProviderCredentialOptions(
  companyId: string | null | undefined,
  channel?: string,
) {
  return useQuery({
    queryKey: ['provider-credentials', 'options', companyId, channel],
    queryFn: () =>
      engineClient
        .get<CredentialOptionItem[]>('/provider-credentials/options', {
          params: { companyId, channel, active: true },
        })
        .then((r) => r.data),
    enabled: Boolean(companyId),
  });
}

export function useProviderCredential(id: string | null | undefined) {
  return useQuery({
    queryKey: ['provider-credentials', id],
    queryFn: () =>
      engineClient
        .get<ProviderCredentials>(`/provider-credentials/${id}`)
        .then((r) => r.data),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
// Mutations define only mutationFn.
// Success snacks + query invalidation are handled by useCrudFeedback in callers.
// Error toasts come from the global mutationCache.onError (mapApiError).

export function useCreateCredentialsMutation() {
  return useMutation({
    mutationFn: (dto: CreateProviderCredentialsDto) =>
      engineClient
        .post<ProviderCredentials>('/provider-credentials', dto)
        .then((r) => r.data),
  });
}

export function useUpdateCredentialsMutation() {
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateProviderCredentialsDto) =>
      engineClient
        .patch<ProviderCredentials>(`/provider-credentials/${id}`, dto)
        .then((r) => r.data),
  });
}

export function useDeleteCredentialsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      engineClient.delete(`/provider-credentials/${id}`).then((r) => r.data),
    onSuccess: (_data, _id, _ctx) => {
      qc.invalidateQueries({ queryKey: ['provider-credentials'] });
    },
  });
}

export interface TestCredentialsResult {
  success: boolean;
  message: string;
  provider: string;
  connectionType: string;
  checkedAt: string;
}

export function useTestCredentialsMutation() {
  return useMutation({
    mutationFn: (id: string) =>
      engineClient
        .post<TestCredentialsResult>(`/provider-credentials/${id}/test`)
        .then((r) => r.data),
  });
}
