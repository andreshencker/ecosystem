'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
  BulkAssignContractPayload,
  BulkAssignContractResult,
  BulkAssignContractError,
  CalendarSyncResult,
  Shift,
  ShiftListResponse,
  ShiftAssignmentSummary,
  ShiftPendingListResponse,
  CreateShiftPayload,
  UpdateShiftPayload,
  BusinessSyncResult,
  SyncHistoryResponse,
} from '@/types/shift';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

export interface ShiftsParams {
  page?:              number;
  limit?:             number;
  contractId?:        string;
  customerId?:        string;
  status?:            string;
  date?:              string;
  search?:            string;
  source?:            'calendar' | 'manual';
  linkedCalendarId?:  string;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useShifts(params: ShiftsParams = {}) {
  return useQuery({
    queryKey: ['shifts', params],
    queryFn: () =>
      apiClient
        .get<ShiftListResponse>('/shifts', { params })
        .then((r) => r.data),
  });
}

export function useShift(id: string, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['shifts', id],
    queryFn: () =>
      apiClient.get<Shift>(`/shifts/${id}`).then((r) => r.data),
    enabled: options?.enabled ?? !!id,
  });
}

export function useShiftSyncHistory(params: { page?: number; limit?: number; linkedCalendarId?: string } = {}) {
  return useQuery({
    queryKey: ['shifts', 'sync', 'history', params],
    queryFn: () =>
      apiClient
        .get<SyncHistoryResponse>('/shifts/sync/history', { params })
        .then((r) => r.data),
  });
}

/**
 * BI-sourced paginated list of imported Shifts awaiting Contract assignment.
 * Only enabled when the BI ETL has run (etlSyncedAt != null) and count > 0.
 * No pending rule is calculated in React — BI is the authoritative source.
 */
export interface ShiftPendingListParams {
  enabled?:          boolean;
  page?:             number;
  limit?:            number;
  linkedCalendarId?: string;
  dateFrom?:         string;
  dateTo?:           string;
  search?:           string;
}

export function useShiftPendingList(params: ShiftPendingListParams = {}) {
  const { enabled = true, ...queryParams } = params;
  return useQuery<ShiftPendingListResponse | null>({
    queryKey: ['shifts', 'assignment', 'pending', queryParams],
    queryFn:  () =>
      apiClient
        .get<ShiftPendingListResponse>('/analytics/shifts/assignment/pending', { params: queryParams })
        .then((r) => r.data)
        .catch(() => null),   // BI unavailable → null; does not affect operational table
    enabled,
    staleTime: 30_000,
    retry:     false,
  });
}

/**
 * BI-sourced summary of imported Shifts that still need a Contract assignment.
 * The count (`importedPendingContract`) comes exclusively from BI.
 * No pending rule is evaluated in React or NestJS.
 */
export function useShiftAssignmentSummary() {
  return useQuery<ShiftAssignmentSummary | null>({
    queryKey: ['shifts', 'assignment', 'summary'],
    queryFn: () =>
      apiClient
        .get<ShiftAssignmentSummary>('/analytics/shifts/assignment/summary')
        .then((r) => r.data)
        .catch(() => null),  // BI unavailable → null; Shift table remains usable
    staleTime: 60_000,
    retry: false,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useTriggerSyncMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: () =>
      apiClient.post<BusinessSyncResult>('/shifts/sync').then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['shifts', 'assignment', 'summary'] });
      const msg = data.totalErrors > 0
        ? `Sync finished with ${data.totalErrors} error(s). ${data.totalCreated} imported, ${data.totalUpdated} updated.`
        : `Sync complete — ${data.totalCreated} imported, ${data.totalUpdated} updated.`;
      pushSnack({ type: data.totalErrors > 0 ? 'warning' : 'success', message: msg });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Calendar sync failed') }),
  });
}

/**
 * Synchronize a single linked calendar by its linkedCalendarId.
 * Calls POST /shifts/sync/:linkedCalendarId — does NOT trigger the global sync.
 * Use `mutation.variables` to identify which card is currently syncing.
 */
export function useSyncCalendarMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (linkedCalendarId: string) =>
      apiClient
        .post<CalendarSyncResult>(`/shifts/sync/${encodeURIComponent(linkedCalendarId)}`)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['shifts', 'sync', 'history'] });
      const msg =
        data.status === 'failed'
          ? `Sync failed for ${data.calendarName}${data.errors[0] ? ': ' + data.errors[0] : ''}`
          : `${data.calendarName}: ${data.created} imported, ${data.updated} updated.`;
      pushSnack({ type: data.status === 'failed' ? 'error' : 'success', message: msg });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Calendar sync failed') }),
  });
}

export function useCreateShiftMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateShiftPayload) =>
      apiClient.post<Shift>('/shifts', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      pushSnack({ type: 'success', message: 'Shift created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create shift') }),
  });
}

export function useUpdateShiftMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateShiftPayload) =>
      apiClient.patch<Shift>(`/shifts/${id}`, dto).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['shifts', id] });
      pushSnack({ type: 'success', message: 'Shift updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update shift') }),
  });
}

export function useConfirmShiftMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<Shift>(`/shifts/${id}/confirm`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['shifts', id] });
      pushSnack({ type: 'success', message: 'Shift confirmed' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to confirm shift') }),
  });
}

export function useCancelShiftMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.patch<Shift>(`/shifts/${id}/cancel`).then((r) => r.data),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['shifts', id] });
      pushSnack({ type: 'success', message: 'Shift cancelled' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to cancel shift') }),
  });
}

export function useDeleteShiftMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/shifts/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['shifts', 'assignment', 'summary'] });
      pushSnack({ type: 'success', message: 'Shift deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete shift') }),
  });
}

export function useAssignContractMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, contractId }: { id: string; contractId: string }) =>
      apiClient.patch<import('@/types/shift').Shift>(`/shifts/${id}/assign-contract`, { contractId }).then((r) => r.data),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['shifts', id] });
      qc.invalidateQueries({ queryKey: ['shifts', 'assignment', 'summary'] });
      qc.invalidateQueries({ queryKey: ['shifts', 'assignment', 'pending'] });
      pushSnack({ type: 'success', message: 'Contract assigned to Shift.' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to assign contract') }),
  });
}

/**
 * Atomically assign Contracts to multiple Shifts in one bulk request.
 * Calls PATCH /shifts/contracts/bulk — one request, all-or-nothing transaction.
 * On success: invalidates shift list and BI queries, shows success snackbar.
 * On error: the caller handles per-shift error display (modal stays open).
 *
 * Per-shift errors are available on err.response.data.errors.
 */
export function useBulkAssignContractsMutation() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation<BulkAssignContractResult, Error & { response?: { data?: { errors?: BulkAssignContractError[] } } }, BulkAssignContractPayload['assignments']>({
    // Suppress the global error toast — the modal handles errors inline.
    // Without this the MutationCache.onError would also fire a snackbar.
    meta: { suppressGlobalError: true } as Record<string, unknown>,
    mutationFn: (assignments) =>
      apiClient
        .patch<BulkAssignContractResult>('/shifts/contracts/bulk', { assignments })
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['shifts'] });
      qc.invalidateQueries({ queryKey: ['shifts', 'assignment', 'summary'] });
      qc.invalidateQueries({ queryKey: ['shifts', 'assignment', 'pending'] });
      const n = data.updated;
      const s = data.skipped;
      const msg = n > 0
        ? `${n} Shift${n !== 1 ? 's' : ''} assigned.${s > 0 ? ` ${s} stale record${s !== 1 ? 's' : ''} cleaned up.` : ''}`
        : `${s} stale BI record${s !== 1 ? 's' : ''} cleaned up.`;
      pushSnack({ type: 'success', message: msg });
    },
  });
}
