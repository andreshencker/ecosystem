'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
  BulkImportEventsPayload,
  CommunicationEvent,
  CommunicationEventListResponse,
  CreateEventPayload,
  UpdateEventPayload,
} from '@/types/communication-events';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

const BASE = '/settings/communication-events';

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

export function useCommunicationEvents({ enabled = true, ...params }: EventListParams = {}) {
  return useQuery({
    queryKey: ['communication-events', params],
    queryFn:  () =>
      apiClient
        .get<CommunicationEventListResponse>(BASE, { params })
        .then((r) => r.data),
    enabled: enabled && !!params.domainCatalogueId,
  });
}

export function useCommunicationEvent(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['communication-events', id],
    queryFn:  () =>
      apiClient.get<CommunicationEvent>(`${BASE}/${id}`).then((r) => r.data),
    enabled: options?.enabled ?? !!id,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCommunicationEventMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateEventPayload) =>
      apiClient.post<CommunicationEvent>(BASE, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['communication-events'] });
      pushSnack({ type: 'success', message: 'Communication Event created' });
    },
    onError: (error) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(error, 'Failed to create communication event'),
      }),
  });
}

export function useUpdateCommunicationEventMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateEventPayload) =>
      apiClient.patch<CommunicationEvent>(`${BASE}/${id}`, dto).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['communication-events'] });
      qc.invalidateQueries({ queryKey: ['communication-events', id] });
      pushSnack({ type: 'success', message: 'Communication Event updated' });
    },
    onError: (error) =>
      pushSnack({
        type: 'error',
        message: extractApiMessage(error, 'Failed to update communication event'),
      }),
  });
}

export function useDeleteCommunicationEventMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`${BASE}/${id}`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['communication-events'] });
      qc.removeQueries({ queryKey: ['communication-events', id] });
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
        .post<CommunicationEvent[]>(`${BASE}/bulk`, payload)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['communication-events'] });
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
