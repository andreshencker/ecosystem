'use client';

import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { engineClient } from '@/lib/engine-axios';
import type {
  CalendarConnection,
  CalendarConnectionsPage,
  CalendarInfo,
  CalendarEvent,
  CalendarEventsPage,
  CalendarTestResult,
  ConnectCalendarDto,
  CreateCalendarDto,
  UpdateCalendarDto,
  CreateEventDto,
  UpdateEventDto,
  ListEventsQuery,
} from '@/types/calendar';

// ─── Calendar connections ─────────────────────────────────────────────────────

export function useCalendarConnections() {
  return useQuery({
    queryKey: ['calendar', 'connections'],
    queryFn: () =>
      engineClient
        .get<CalendarConnectionsPage>('/calendar/connections')
        .then((r) => r.data),
  });
}

export function useConnectCalendarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: ConnectCalendarDto) =>
      engineClient.post<CalendarConnection>('/calendar/connect', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'connections'] });
    },
  });
}

export function useDisconnectCalendarMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (credId: string) =>
      engineClient.delete(`/calendar/connections/${credId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'connections'] });
      qc.invalidateQueries({ queryKey: ['calendar', 'calendars'] });
    },
  });
}

export function useTestCalendarConnectionMutation() {
  return useMutation({
    mutationFn: (credId: string) =>
      engineClient
        .post<CalendarTestResult>(`/calendar/connections/${credId}/test`)
        .then((r) => r.data),
  });
}

// ─── Calendars ────────────────────────────────────────────────────────────────

export function useCalendars(credId: string | null | undefined) {
  return useQuery({
    queryKey: ['calendar', 'calendars', credId],
    queryFn: () =>
      engineClient
        .get<{ data: CalendarInfo[] }>(`/calendar/connections/${credId}/calendars`)
        .then((r) => r.data.data ?? []),
    enabled: Boolean(credId),
  });
}

export function useCreateCalendarMutation(credId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateCalendarDto) =>
      engineClient
        .post<CalendarInfo>(`/calendar/connections/${credId}/calendars`, dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'calendars', credId] });
    },
  });
}

export function useUpdateCalendarMutation(credId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ calId, ...dto }: { calId: string } & UpdateCalendarDto) =>
      engineClient
        .patch<CalendarInfo>(
          `/calendar/connections/${credId}/calendars/${encodeURIComponent(calId)}`,
          dto,
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'calendars', credId] });
    },
  });
}

export function useDeleteCalendarMutation(credId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (calId: string) =>
      engineClient
        .delete(`/calendar/connections/${credId}/calendars/${encodeURIComponent(calId)}`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'calendars', credId] });
      qc.invalidateQueries({ queryKey: ['calendar', 'events'] });
    },
  });
}

// ─── Events ───────────────────────────────────────────────────────────────────

export function useCalendarEvents(
  credId: string | null | undefined,
  calId: string | null | undefined,
  query: ListEventsQuery = {},
) {
  return useQuery({
    queryKey: ['calendar', 'events', credId, calId, query],
    queryFn: () =>
      engineClient
        .get<CalendarEventsPage>(
          `/calendar/connections/${credId}/calendars/${encodeURIComponent(calId!)}/events`,
          { params: query },
        )
        .then((r) => r.data),
    enabled: Boolean(credId) && Boolean(calId),
  });
}

export function useCreateEventMutation(credId: string, calId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (dto: CreateEventDto) =>
      engineClient
        .post<CalendarEvent>(
          `/calendar/connections/${credId}/calendars/${encodeURIComponent(calId)}/events`,
          dto,
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'events', credId, calId] });
    },
  });
}

export function useUpdateEventMutation(credId: string, calId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ evId, ...dto }: { evId: string } & UpdateEventDto) =>
      engineClient
        .patch<CalendarEvent>(
          `/calendar/connections/${credId}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(evId)}`,
          dto,
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'events', credId, calId] });
    },
  });
}

export function useDeleteEventMutation(credId: string, calId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (evId: string) =>
      engineClient
        .delete(
          `/calendar/connections/${credId}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(evId)}`,
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'events', credId, calId] });
    },
  });
}

/**
 * Direct delete mutation that accepts credId, calId, and evId at call time.
 * Used when the calendar is not known until the user acts (e.g. "All Calendars" view).
 */
export function useDeleteEventDirectMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      credId,
      calId,
      evId,
    }: {
      credId: string;
      calId: string;
      evId: string;
    }) =>
      engineClient
        .delete(
          `/calendar/connections/${credId}/calendars/${encodeURIComponent(calId)}/events/${encodeURIComponent(evId)}`,
        )
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar', 'events'] });
    },
  });
}

/**
 * Loads events from ALL calendars belonging to a connection and merges them.
 * Uses useQueries (TanStack Query v5) to fan-out requests in parallel.
 *
 * Pass `calendarIds: []` or `credId: null` to disable all queries.
 */
export function useAllCalendarsEvents(
  credId: string | null | undefined,
  calendarIds: string[],
  query: ListEventsQuery = {},
) {
  const active = Boolean(credId) && calendarIds.length > 0;

  const results = useQueries({
    queries: active
      ? calendarIds.map((calId) => ({
          queryKey: ['calendar', 'events', credId, calId, query] as const,
          queryFn: () =>
            engineClient
              .get<CalendarEventsPage>(
                `/calendar/connections/${credId}/calendars/${encodeURIComponent(calId)}/events`,
                { params: query },
              )
              .then((r) => r.data),
        }))
      : [],
  });

  return {
    events:    results.flatMap((r) => r.data?.items ?? []),
    isLoading: active && results.some((r) => r.isLoading),
    isError:   results.some((r) => r.isError),
  };
}
