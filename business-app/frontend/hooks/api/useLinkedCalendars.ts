'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';
import type {
  AvailableCalendarAccount,
  AvailableCalendar,
  CalendarFlow,
  CalendarOption,
  CreateCalendarPayload,
  LinkedCalendar,
  LinkCalendarsPayload,
  PublicCalendarEntry,
  SetupCalendarPayload,
  SetupCalendarResult,
  SubscribeByUrlPayload,
  SubscribeFromCataloguePayload,
  UpdateLinkedCalendarPayload,
  LinkedCalendarsQuery,
  SetupAustralianHolidaysResult,
  DiscoverHolidaysPayload,
  HolidayDiscoveryResult,
  LinkHolidayCalendarPayload,
} from '@/types/linked-calendar';

// ─── Available calendar accounts ──────────────────────────────────────────────

export function useAvailableCalendarAccounts() {
  return useQuery<AvailableCalendarAccount[]>({
    queryKey: ['linked-calendars', 'accounts'],
    queryFn: () =>
      apiClient
        .get<{ data: AvailableCalendarAccount[] }>('/linked-calendars/accounts')
        .then((r) => r.data.data),
    staleTime: 30_000,
  });
}

// ─── Available calendars for a connection ─────────────────────────────────────

export function useAvailableCalendars(connectionId: string | null) {
  return useQuery<AvailableCalendar[]>({
    queryKey: ['linked-calendars', 'accounts', connectionId, 'calendars'],
    queryFn: () =>
      apiClient
        .get<{ data: AvailableCalendar[] }>(
          `/linked-calendars/accounts/${encodeURIComponent(connectionId!)}/calendars`,
        )
        .then((r) => r.data.data),
    enabled: !!connectionId,
    staleTime: 20_000,
  });
}

// ─── Linked calendars list ────────────────────────────────────────────────────

export function useLinkedCalendars(params: LinkedCalendarsQuery = {}) {
  return useQuery<LinkedCalendar[]>({
    queryKey: ['linked-calendars', 'list', params],
    queryFn: () =>
      apiClient
        .get<{ data: LinkedCalendar[] }>('/linked-calendars', { params })
        .then((r) => r.data.data),
    staleTime: 15_000,
  });
}

// ─── Flow-filtered safe options ───────────────────────────────────────────────

export function useCalendarOptions(flow: CalendarFlow | null) {
  return useQuery<CalendarOption[]>({
    queryKey: ['linked-calendars', 'options', flow],
    queryFn: () =>
      apiClient
        .get<{ data: CalendarOption[] }>('/linked-calendars/options', { params: { flow } })
        .then((r) => r.data.data),
    enabled: !!flow,
    staleTime: 30_000,
  });
}

// ─── Link selected calendars ──────────────────────────────────────────────────

export function useLinkCalendarsMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation<LinkedCalendar[], Error, LinkCalendarsPayload>({
    mutationFn: (dto) =>
      apiClient
        .post<{ data: LinkedCalendar[] }>('/linked-calendars/link', dto)
        .then((r) => r.data.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'options'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'accounts', vars.connectionId, 'calendars'] });
      pushSnack({ type: 'success', message: 'Calendars saved successfully.' });
    },
    onError: (error) =>
      pushSnack({
        type:    'error',
        message: extractApiMessage(error, 'Failed to save calendars'),
      }),
  });
}

// ─── Update (status and/or flow) ─────────────────────────────────────────────

export function useUpdateLinkedCalendarMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation<LinkedCalendar, Error, { id: string } & UpdateLinkedCalendarPayload>({
    mutationFn: ({ id, ...payload }) =>
      apiClient
        .patch<LinkedCalendar>(`/linked-calendars/${id}`, payload)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'options'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'accounts'] });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update calendar') }),
  });
}

// ─── Activate ────────────────────────────────────────────────────────────────

export function useActivateLinkedCalendarMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation<LinkedCalendar, Error, string>({
    mutationFn: (id) =>
      apiClient.patch<LinkedCalendar>(`/linked-calendars/${id}/activate`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'options'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'accounts'] });
      pushSnack({ type: 'success', message: 'Calendar activated.' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to activate calendar') }),
  });
}

// ─── Pause ────────────────────────────────────────────────────────────────────

export function usePauseLinkedCalendarMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation<LinkedCalendar, Error, string>({
    mutationFn: (id) =>
      apiClient.patch<LinkedCalendar>(`/linked-calendars/${id}/pause`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'options'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'accounts'] });
      pushSnack({ type: 'success', message: 'Calendar paused.' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to pause calendar') }),
  });
}

// ─── Create calendar in provider and link automatically ──────────────────────

export function useCreateAndLinkCalendarMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation<LinkedCalendar, Error, CreateCalendarPayload>({
    mutationFn: (dto) =>
      apiClient
        .post<LinkedCalendar>('/linked-calendars/create', dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'options'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'accounts'] });
      pushSnack({ type: 'success', message: 'Calendar created and linked.' });
    },
    onError: (error) =>
      pushSnack({
        type:    'error',
        message: extractApiMessage(error, 'Failed to create calendar'),
      }),
  });
}

// ─── Subscribe by URL ─────────────────────────────────────────────────────────

export function useSubscribeByUrlMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation<LinkedCalendar, Error, SubscribeByUrlPayload>({
    mutationFn: (dto) =>
      apiClient
        .post<LinkedCalendar>('/linked-calendars/subscribe-url', dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'options'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'accounts'] });
      pushSnack({ type: 'success', message: 'Calendar subscribed and linked.' });
    },
    onError: (error) =>
      pushSnack({
        type:    'error',
        message: extractApiMessage(error, 'Failed to subscribe to calendar URL'),
      }),
  });
}

// ─── Subscribe from catalogue ─────────────────────────────────────────────────

export function useSubscribeFromCatalogueMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation<LinkedCalendar, Error, SubscribeFromCataloguePayload>({
    mutationFn: (dto) =>
      apiClient
        .post<LinkedCalendar>('/linked-calendars/subscribe-catalogue', dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'options'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'accounts'] });
      pushSnack({ type: 'success', message: 'Calendar subscribed and linked.' });
    },
    onError: (error) =>
      pushSnack({
        type:    'error',
        message: extractApiMessage(error, 'Failed to subscribe from catalogue'),
      }),
  });
}

// ─── One-click setup mutations ────────────────────────────────────────────────

export function useSetupPaymentCalendarMutation() {
  const qc = useQueryClient();

  return useMutation<SetupCalendarResult, Error, SetupCalendarPayload>({
    mutationFn: (dto) =>
      apiClient
        .post<SetupCalendarResult>('/linked-calendars/setup/payment', dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'options', 'payments'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
      // Invalidate available-calendars cache so the newly linked calendar disappears from the Link Calendars drawer
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'accounts'] });
    },
    // Error snacks are shown by callers for context-specific messages
  });
}

export function useSetupAustralianHolidaysMutation() {
  const qc = useQueryClient();

  return useMutation<SetupAustralianHolidaysResult, Error, SetupCalendarPayload>({
    mutationFn: (dto) =>
      apiClient
        .post<SetupAustralianHolidaysResult>('/linked-calendars/setup/australian-holidays', dto)
        .then((r) => r.data),
    onSuccess: (data) => {
      if (data.status === 'linked') {
        qc.invalidateQueries({ queryKey: ['linked-calendars', 'options', 'holidays'] });
        qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
        // Invalidate available-calendars cache so the newly linked calendar disappears from the Link Calendars drawer
        qc.invalidateQueries({ queryKey: ['linked-calendars', 'accounts'] });
      }
    },
  });
}

// ─── Discover Australian holiday calendars (after manual setup) ───────────────

export function useDiscoverAustralianHolidaysMutation() {
  return useMutation<HolidayDiscoveryResult, Error, DiscoverHolidaysPayload>({
    mutationFn: (dto) =>
      apiClient
        .post<HolidayDiscoveryResult>('/linked-calendars/setup/australian-holidays/discover', dto)
        .then((r) => r.data),
  });
}

// ─── Link selected calendar as Australian holidays ────────────────────────────

export function useLinkHolidayCalendarMutation() {
  const qc = useQueryClient();

  return useMutation<SetupAustralianHolidaysResult, Error, LinkHolidayCalendarPayload>({
    mutationFn: (dto) =>
      apiClient
        .post<SetupAustralianHolidaysResult>('/linked-calendars/setup/australian-holidays/link-selected', dto)
        .then((r) => r.data),
    onSuccess: (data) => {
      if (data.status === 'linked') {
        qc.invalidateQueries({ queryKey: ['linked-calendars', 'options', 'holidays'] });
        qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
      }
    },
  });
}

// ─── Public catalogue ─────────────────────────────────────────────────────────

export function usePublicCalendarCatalogue(country: string = 'AU') {
  return useQuery<PublicCalendarEntry[]>({
    queryKey: ['linked-calendars', 'catalogue', country],
    queryFn: () =>
      apiClient
        .get<{ data: PublicCalendarEntry[] }>('/linked-calendars/catalogue', {
          params: { country },
        })
        .then((r) => r.data.data),
    staleTime: 5 * 60_000, // catalogue rarely changes
  });
}

// ─── Unlink ───────────────────────────────────────────────────────────────────

export function useUnlinkLinkedCalendarMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation<{ deleted: boolean }, Error, string>({
    mutationFn: (id) =>
      apiClient.delete<{ deleted: boolean }>(`/linked-calendars/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'list'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'options'] });
      qc.invalidateQueries({ queryKey: ['linked-calendars', 'accounts'] });
      pushSnack({ type: 'success', message: 'Calendar removed.' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to unlink calendar') }),
  });
}
