'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
  ApproveInvoicePayload,
  ApprovedInvoiceListResult,
  ReceivablesSummary,
  InvoiceDashboardFilters,
  CashFlowResponse,
  InvoiceApprovalResult,
  PendingInvoiceGroupsResult,
} from '@/types/invoice';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

const QUERY_KEY = ['invoices', 'pending-groups'] as const;
const APPROVED_QUERY_KEY = ['invoices', 'approved'] as const;
const SUMMARY_QUERY_KEY = ['invoices', 'receivables-summary'] as const;

/** Fetches pending invoice groups from BI on every call (no stale data). */
export function usePendingInvoiceGroups() {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () =>
      apiClient
        .get<PendingInvoiceGroupsResult>('/analytics/invoices/pending-groups')
        .then((r) => r.data),
    staleTime: 0,
  });
}

export function useApprovedInvoices() {
  return useQuery({
    queryKey: APPROVED_QUERY_KEY,
    queryFn: () =>
      apiClient
        .get<ApprovedInvoiceListResult>('/invoices')
        .then((r) => r.data),
  });
}

export function useReceivablesSummary(filters: InvoiceDashboardFilters = {}) {
  return useQuery({
    queryKey: [...SUMMARY_QUERY_KEY, filters],
    queryFn: () => apiClient.get<ReceivablesSummary>('/analytics/invoices/receivables-summary', { params: filters }).then((r) => r.data),
  });
}

export function useInvoiceCashFlow(filters: { dateFrom?: string; dateTo?: string; customerId?: string } = {}) {
  return useQuery({
    queryKey: ['invoices', 'cash-flow', filters],
    queryFn: () => apiClient.get<CashFlowResponse>('/analytics/invoices/cash-flow', { params: filters }).then((r) => r.data),
  });
}

export function useMarkInvoicePaidMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: ({ invoiceId, ...payload }: { invoiceId: string; paidAt: string; reference?: string; notes?: string }) =>
      apiClient.patch(`/invoices/${invoiceId}/mark-paid`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPROVED_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SUMMARY_QUERY_KEY });
      qc.invalidateQueries({ queryKey: ['invoices', 'cash-flow'] });
      pushSnack({ type: 'success', message: 'Invoice marked as paid.' });
    },
    onError: (err) => pushSnack({ type: 'error', message: extractApiMessage(err, 'Failed to mark invoice as paid') }),
  });
}

export function useMarkInvoiceSentMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: ({ invoiceId, ...payload }: { invoiceId: string; sentAt: string }) =>
      apiClient.patch(`/invoices/${invoiceId}/mark-sent`, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPROVED_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SUMMARY_QUERY_KEY });
      pushSnack({ type: 'success', message: 'Invoice marked as sent.' });
    },
    onError: (err) => pushSnack({ type: 'error', message: extractApiMessage(err, 'Failed to mark invoice as sent') }),
  });
}

export function useRecordInvoiceReminderMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (invoiceId: string) => apiClient.post(`/invoices/${invoiceId}/reminders`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPROVED_QUERY_KEY });
      pushSnack({ type: 'success', message: 'Payment reminder recorded.' });
    },
    onError: (err) => pushSnack({ type: 'error', message: extractApiMessage(err, 'Failed to record payment reminder') }),
  });
}

export function useVoidInvoiceMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: ({ invoiceId, reason }: { invoiceId: string; reason: string }) =>
      apiClient.patch(`/invoices/${invoiceId}/void`, { reason }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: APPROVED_QUERY_KEY });
      qc.invalidateQueries({ queryKey: SUMMARY_QUERY_KEY });
      pushSnack({ type: 'success', message: 'Invoice voided.' });
    },
    onError: (err) => pushSnack({ type: 'error', message: extractApiMessage(err, 'Failed to void invoice') }),
  });
}

export function useAddInvoiceConceptMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (payload: { groupId: string; date: string; concept: string; amount: string }) =>
      apiClient.post('/invoices/review-items', payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      pushSnack({ type: 'success', message: 'Concept added.' });
    },
    onError: (err) => pushSnack({ type: 'error', message: extractApiMessage(err, 'Failed to add concept') }),
  });
}

export function useDeleteInvoiceConceptMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (itemId: string) => apiClient.delete(`/invoices/review-items/${itemId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEY }),
    onError: (err) => pushSnack({ type: 'error', message: extractApiMessage(err, 'Failed to remove concept') }),
  });
}

/** Approves a billing group, then refreshes the pending list automatically. */
export function useApproveInvoiceMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (payload: ApproveInvoicePayload) =>
      apiClient
        .post<InvoiceApprovalResult>('/invoices/approve', payload)
        .then((r) => r.data),

    onSuccess: (data) => {
      pushSnack({
        type: 'success',
        message: `Invoice ${data.invoiceNumber} approved successfully.`,
      });
      qc.invalidateQueries({ queryKey: QUERY_KEY });
      qc.invalidateQueries({ queryKey: APPROVED_QUERY_KEY });
    },

    onError: (err) => {
      pushSnack({
        type: 'error',
        message: extractApiMessage(err, 'Failed to approve invoice'),
      });
    },
  });
}
