'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
  BulkImportEventsPayload,
  RelayEvent,
  RelayEventListResponse,
  CreateEventPayload,
  UpdateEventPayload,
} from '@/types/relay-events';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

const BASE = '/settings/relay-events';

// ─── Query params ─────────────────────────────────────────────────────────────

export interface EventListParams {
  domainCatalogueId?: string;
  page?:              number;
  limit?:             number;
  active?:            boolean;
  /** When false the query is skipped (e.g. no Communications connection or no domain selected). */
  enabled?:           boolean;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useRelayEvents({ enabled = true, ...params }: EventListParams = {}) {
  return useQuery({
    queryKey: ['relay-events', params],
    queryFn:  () =>
      apiClient
        .get<RelayEventListResponse>(BASE, { params })
        .then((r) => r.data),
    enabled: enabled && !!params.domainCatalogueId,
  });
}

export function useRelayEvent(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['relay-events', id],
    queryFn:  () =>
      apiClient.get<RelayEvent>(`${BASE}/${id}`).then((r) => r.data),
    enabled: options?.enabled ?? !!id,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateRelayEventMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateEventPayload) =>
      apiClient.post<RelayEvent>(BASE, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['relay-events'] });
      pushSnack({ type: 'success', message: 'Communication Event created' });
    },
    onError: (error) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(error, 'Failed to create communication event'),
      }),
  });
}

export function useUpdateRelayEventMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateEventPayload) =>
      apiClient.patch<RelayEvent>(`${BASE}/${id}`, dto).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['relay-events'] });
      qc.invalidateQueries({ queryKey: ['relay-events', id] });
      pushSnack({ type: 'success', message: 'Communication Event updated' });
    },
    onError: (error) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(error, 'Failed to update communication event'),
      }),
  });
}

export function useDeleteRelayEventMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`${BASE}/${id}`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['relay-events'] });
      qc.removeQueries({ queryKey: ['relay-events', id] });
      pushSnack({ type: 'success', message: 'Communication Event deleted' });
    },
    onError: (error) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(error, 'Failed to delete communication event'),
      }),
  });
}

export function useBulkImportEventsMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (payload: BulkImportEventsPayload) =>
      apiClient
        .post<RelayEvent[]>(`${BASE}/bulk`, payload)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['relay-events'] });
      pushSnack({
        type: 'success',
        message: `${Array.isArray(data) ? data.length : 0} event(s) imported`,
      });
    },
    onError: (error) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(error, 'Failed to import communication events'),
      }),
  });
}
