'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { engineClient } from '@/lib/engine-axios';
import type { EventCatalogue } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EventCatalogueParams {
  active?: boolean;
  populateDomainCatalogue?: boolean;
  limit?: number;
  offset?: number;
}

interface BackendPage<T> { data: T[]; total: number; limit: number; offset: number; }

export interface EventCataloguePaginatedResponse {
  items: EventCatalogue[];
  total: number;
}

export interface EmailChannelContent {
  enabled: boolean;
  subject?: string;
  content?: string;
  requiredVariables?: string[];
  optionalVariables?: string[];
  files?: {
    required?: string[];
    optional?: string[];
  };
}

export interface SmsChannelContent {
  enabled: boolean;
  content?: string;
  requiredVariables?: string[];
  optionalVariables?: string[];
}

export interface EventChannelContent {
  email?: EmailChannelContent;
  sms?: SmsChannelContent;
}

export interface CreateEventCatalogueDto {
  domainCatalogueId: string;
  eventKey: string;
  displayName: string;
  description?: string;
  eventType: 'notification' | 'alert' | 'request' | 'security';
  channelContent?: EventChannelContent;
}

export type UpdateEventCatalogueDto = Partial<Omit<CreateEventCatalogueDto, 'domainCatalogueId'>> & { isActive?: boolean };

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useEventCatalogues(
  domainCatalogueId: string | null | undefined,
  params: EventCatalogueParams = {},
) {
  return useQuery({
    queryKey: ['event-catalogue', domainCatalogueId, params],
    queryFn: () =>
      engineClient
        .get<BackendPage<EventCatalogue>>('/event-catalogue', {
          params: { domainCatalogueId, ...params },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    enabled: Boolean(domainCatalogueId),
  });
}

export function useEventCatalogue(id: string | null | undefined) {
  return useQuery({
    queryKey: ['event-catalogue', id],
    queryFn: () =>
      engineClient.get<EventCatalogue>(`/event-catalogue/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useBulkImportEventCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (events: CreateEventCatalogueDto[]) =>
      engineClient.post('/event-catalogue/bulk', { events }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-catalogue'] });
      pushSnack({ type: 'success', message: 'Events imported' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to import events') }),
  });
}

export function useCreateEventCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateEventCatalogueDto) =>
      engineClient.post<EventCatalogue>('/event-catalogue', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-catalogue'] });
      pushSnack({ type: 'success', message: 'Event created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create event') }),
  });
}

export function useUpdateEventCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateEventCatalogueDto) =>
      engineClient.patch<EventCatalogue>(`/event-catalogue/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-catalogue'] });
      pushSnack({ type: 'success', message: 'Event updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update event') }),
  });
}

export function useDeleteEventCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      engineClient.delete(`/event-catalogue/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['event-catalogue'] });
      pushSnack({ type: 'success', message: 'Event deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete event') }),
  });
}

export function usePreviewNotificationEmailHtmlMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({
      layoutTemplateId,
      eventCatalogueId,
      mock,
      payload,
    }: {
      layoutTemplateId: string;
      eventCatalogueId: string;
      mock?: boolean;
      payload?: Record<string, unknown>;
    }) =>
      engineClient
        .post<string>(
          '/preview/notifications/email/html',
          { layoutTemplateId, eventCatalogueId, mock, payload },
          { headers: { Accept: 'text/html, */*' }, responseType: 'text' },
        )
        .then((r) => r.data as unknown as string),
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Preview failed') }),
  });
}
