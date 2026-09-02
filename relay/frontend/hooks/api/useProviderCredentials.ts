'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
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
  /** OAuth providers only — which auth-mode tab this was saved from. */
  oauthAppSource?: 'ecosystem' | 'own';
}

export interface UpdateProviderCredentialsDto {
  tag?: string;
  credentials?: Record<string, unknown>;
  isActive?: boolean;
  /** OAuth providers only — which auth-mode tab this was saved from. */
  oauthAppSource?: 'ecosystem' | 'own';
}

// ─── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetches all credentials for a company in a single request.
 * Always returns populated provider + channel info (no encrypted payload).
 */
/**
 * Distinct channelKeys ("email", "calendar", "payment", …) with at least
 * one active credential for the current company. Drives which navbar tabs
 * (Calendar, Payments, Accounting, Notifications, …) are shown — a channel
 * with nothing configured stays hidden.
 */
/**
 * Distinct channelKeys and providerKeys with at least one active credential.
 * `channels` drives which navbar tabs are shown; `providerKeys` lets a tab
 * additionally require a specific provider when only some providers within a
 * channel support the capability it needs (e.g. only gmail_oauth can read a
 * mailbox — the generic "email" channel also covers send-only providers).
 */
export function useConfiguredChannels() {
  return useQuery({
    queryKey: ['provider-credentials', 'configured-channels'],
    queryFn: () =>
      apiClient
        .get<{ channels: string[]; providerKeys: string[] }>('/provider-credentials/configured-channels')
        .then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useAllCompanyCredentials(
  companyId: string | null | undefined,
  options: { active?: boolean } = {},
) {
  return useQuery({
    queryKey: ['provider-credentials', 'company-all', companyId, options],
    queryFn: () =>
      apiClient
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
      apiClient
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
      apiClient
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
      apiClient
        .get<ProviderCredentials>(`/provider-credentials/${id}`)
        .then((r) => r.data),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
// Mutations define only mutationFn.
// Success snacks + query invalidation are handled by useCrudFeedback in callers.
// Errors are suppressed from the global toast — CredentialForm shows the
// specific backend message inline (extractCredentialError/setFormError),
// so the generic global toast would otherwise duplicate it with a vaguer
// message (e.g. masking a 409 duplicate-tag conflict as a generic 400).

export function useCreateCredentialsMutation() {
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: (dto: CreateProviderCredentialsDto) =>
      apiClient
        .post<ProviderCredentials>('/provider-credentials', dto)
        .then((r) => r.data),
  });
}

export function useUpdateCredentialsMutation() {
  return useMutation({
    meta: { suppressGlobalError: true },
    mutationFn: ({ id, ...dto }: { id: string } & UpdateProviderCredentialsDto) =>
      apiClient
        .patch<ProviderCredentials>(`/provider-credentials/${id}`, dto)
        .then((r) => r.data),
  });
}

export function useDeleteCredentialsMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/provider-credentials/${id}`).then((r) => r.data),
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
      apiClient
        .post<TestCredentialsResult>(`/provider-credentials/${id}/test`)
        .then((r) => r.data),
  });
}
