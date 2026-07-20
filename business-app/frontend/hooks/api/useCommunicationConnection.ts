'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

// ─── Shared types ─────────────────────────────────────────────────────────────

export interface IntegrationConnection {
  id: string;
  provider: string;
  tokenPrefix: string;
  isActive: boolean;
  lastTestedAt: string | null;
  lastStatus: 'connected' | 'failed' | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IntegrationTestResult {
  success: boolean;
  status: 'connected' | 'failed';
  message: string;
  checkedAt: string;
}

// ─── Generic integration hook factory ────────────────────────────────────────
//
// Usage:
//   const { connection, save, test, toggle, remove } = useIntegration('communications');
//
// Every future integration (stripe, xero, crm, storage…) reuses this hook
// with a different provider string — zero additional hook code needed.

export function useIntegration(provider: string) {
  const qc        = useQueryClient();
  const queryKey  = ['settings', provider];
  const base      = `/settings/${provider}`;
  const pushSnack = useUIStore((s) => s.pushSnack);

  const connection = useQuery<IntegrationConnection | null>({
    queryKey,
    queryFn: async () => {
      try {
        return (await apiClient.get<IntegrationConnection>(base)).data;
      } catch (err: any) {
        if (err?.response?.status === 404) return null;
        throw err;
      }
    },
    staleTime: 30_000,
    retry: false,
  });

  /**
   * Save or replace the token.
   * Always encrypts server-side — the raw token is never stored client-side.
   */
  const save = useMutation<IntegrationConnection, Error, { token: string; isActive?: boolean }>({
    mutationFn: (p) => apiClient.put<IntegrationConnection>(base, p).then((r) => r.data),
    onSuccess: (data) => {
      qc.setQueryData(queryKey, data);
      pushSnack({ type: 'success', message: 'Integration saved successfully.' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to save integration') }),
  });

  /**
   * Test a token.
   * - With `{ token }` → test without saving (pre-save validation).
   * - With `{}`        → test the stored token and persist result server-side.
   * Note: result is displayed inline by the component — no toast needed for test.
   */
  const test = useMutation<IntegrationTestResult, Error, { token?: string }>({
    mutationFn: (p) => apiClient.post<IntegrationTestResult>(`${base}/test`, p).then((r) => r.data),
    onSuccess: (_data, vars) => {
      if (!vars.token) qc.invalidateQueries({ queryKey });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to test connection') }),
  });

  /** Toggle active/inactive without changing the token. */
  const toggle = useMutation<IntegrationConnection, Error, { isActive: boolean }>({
    mutationFn: (p) => apiClient.patch<IntegrationConnection>(base, p).then((r) => r.data),
    onSuccess: (data, vars) => {
      qc.setQueryData(queryKey, data);
      pushSnack({
        type: 'success',
        message: vars.isActive ? 'Integration enabled.' : 'Integration disabled.',
      });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to toggle integration') }),
  });

  /** Permanently delete the connection. */
  const remove = useMutation<{ deleted: boolean }, Error>({
    mutationFn: () => apiClient.delete<{ deleted: boolean }>(base).then((r) => r.data),
    onSuccess: () => {
      qc.setQueryData(queryKey, null);
      pushSnack({ type: 'success', message: 'Integration deleted.' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete integration') }),
  });

  return { connection, save, test, toggle, remove };
}
