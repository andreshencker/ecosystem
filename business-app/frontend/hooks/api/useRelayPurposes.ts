'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
  CreatePurposePayload,
  CredentialOption,
  Purpose,
  PurposeChannel,
  PurposeListResponse,
  UpdatePurposePayload,
} from '@/types/communication-purposes';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

const BASE = '/settings/relay-purposes';

// ─── Query params ─────────────────────────────────────────────────────────────

export interface PurposesParams {
  page?:    number;
  limit?:   number;
  active?:  boolean;
  /** When false the query is skipped (e.g. no Communications connection). */
  enabled?: boolean;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePurposes({ enabled = true, ...params }: PurposesParams = {}) {
  return useQuery({
    queryKey: ['relay-purposes', params],
    queryFn: () =>
      apiClient
        .get<PurposeListResponse>(BASE, { params })
        .then((r) => r.data),
    enabled,
  });
}

export function usePurpose(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['relay-purposes', id],
    queryFn: () =>
      apiClient.get<Purpose>(`${BASE}/${id}`).then((r) => r.data),
    enabled: options?.enabled ?? !!id,
  });
}

export function useCredentialOptions(
  channel: PurposeChannel,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['relay-purposes', 'credential-options', channel],
    queryFn: () =>
      apiClient
        .get<CredentialOption[]>(`${BASE}/credential-options`, {
          params: { channel },
        })
        .then((r) => r.data),
    enabled: options?.enabled ?? true,
    staleTime: 60_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreatePurposeMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreatePurposePayload) =>
      apiClient.post<Purpose>(BASE, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relay-purposes'] });
      pushSnack({ type: 'success', message: 'Communication Purpose created' });
    },
    onError: (error) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(error, 'Failed to create communication purpose'),
      }),
  });
}

export function useUpdatePurposeMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdatePurposePayload) =>
      apiClient.patch<Purpose>(`${BASE}/${id}`, dto).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['relay-purposes'] });
      qc.invalidateQueries({ queryKey: ['relay-purposes', id] });
      pushSnack({ type: 'success', message: 'Communication Purpose updated' });
    },
    onError: (error) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(error, 'Failed to update communication purpose'),
      }),
  });
}

export function useDeletePurposeMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`${BASE}/${id}`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['relay-purposes'] });
      qc.removeQueries({ queryKey: ['relay-purposes', id] });
      pushSnack({ type: 'success', message: 'Communication Purpose deleted' });
    },
    onError: (error) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(error, 'Failed to delete communication purpose'),
      }),
  });
}
