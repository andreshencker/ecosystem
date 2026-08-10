// hooks/api/useBankConnections.ts
//
// React Query hooks for the Bank Connections feature.
// Bank Connections are Open Banking connections to external financial
// institutions — they are NOT Xero bank accounts.

import { useQuery } from '@tanstack/react-query';
import axios from 'axios';

import { apiClient } from '@/lib/axios';
import type {
  BankConnection,
  BankConnectionListResult,
  BankConnectionProvider,
  ListBankConnectionsParams,
} from '@/types/bank-connections';

// ─── Retry policy ─────────────────────────────────────────────────────────────
// Skip retrying on 4xx errors (definitive client/auth errors).
// Retry once on 5xx or network failures.

function retrySkip4xx(failureCount: number, error: unknown): boolean {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status !== undefined && status >= 400 && status < 500) return false;
  }
  return failureCount < 1;
}

// ─── Providers ────────────────────────────────────────────────────────────────

/**
 * Lists registered accounting providers that support the bankConnections
 * capability.  Returns an empty list until a real Open Banking provider is
 * registered.
 */
export function useBankConnectionProviders() {
  return useQuery<{ data: BankConnectionProvider[]; total: number }, Error>({
    queryKey: ['accounting', 'bank-connections', 'providers'],
    queryFn: () =>
      apiClient
        .get<{ data: BankConnectionProvider[]; total: number }>(
          '/accounting/bank-connections/providers',
        )
        .then((r) => r.data),
    staleTime: 5 * 60 * 1000,
    retry: retrySkip4xx,
  });
}

// ─── Connections ──────────────────────────────────────────────────────────────

/**
 * Lists bank connections for the authenticated company.
 *
 * Params are forwarded as query strings to the API.  All params are optional.
 */
export function useBankConnections(
  params: ListBankConnectionsParams = {},
  options: { enabled?: boolean } = {},
) {
  return useQuery<BankConnectionListResult, Error>({
    queryKey: ['accounting', 'bank-connections', 'list', params],
    queryFn: () =>
      apiClient
        .get<BankConnectionListResult>('/accounting/bank-connections', {
          params,
        })
        .then((r) => r.data),
    enabled: options.enabled !== false,
    retry: retrySkip4xx,
  });
}

/**
 * Fetches a single bank connection by ID.
 */
export function useBankConnection(
  id: string | null | undefined,
  options: { enabled?: boolean } = {},
) {
  return useQuery<BankConnection, Error>({
    queryKey: ['accounting', 'bank-connections', 'detail', id],
    queryFn: () =>
      apiClient
        .get<BankConnection>(`/accounting/bank-connections/${id!}`)
        .then((r) => r.data),
    enabled: Boolean(id) && options.enabled !== false,
    retry: retrySkip4xx,
  });
}
