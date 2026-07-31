'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type {
  ApproveInvoicePayload,
  InvoiceApprovalResult,
  PendingInvoiceGroupsResult,
} from '@/types/invoice';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

const QUERY_KEY = ['invoices', 'pending-groups'] as const;

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
    },

    onError: (err) => {
      pushSnack({
        type: 'error',
        message: extractApiMessage(err, 'Failed to approve invoice'),
      });
    },
  });
}
