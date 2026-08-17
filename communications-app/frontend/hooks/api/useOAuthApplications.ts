'use client';

// Reusable OAuth app registrations (Client ID/Secret) — one registration can
// back multiple channel credentials (e.g. Email's Gmail-read and Identity's
// Google-login), so the same secret never needs to be re-entered.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import { extractApiMessage } from '@/lib/mapApiError';
import { useUIStore } from '@/stores/ui.store';

export interface OAuthApplication {
  id: string;
  providerFamily: string;
  displayName: string;
  /** Masked — safe to display, never the secret. */
  clientId: string;
  isActive: boolean;
  /** True when this app belongs to the platform company — usable by any company ("ecosystem" mode). */
  isEcosystem: boolean;
  createdAt: string;
}

export interface CreateOAuthApplicationDto {
  providerFamily: string;
  displayName: string;
  clientId: string;
  clientSecret: string;
}

/**
 * Lists the company's reusable OAuth apps for a provider family (e.g. 'google').
 * Disabled (no fetch) when providerFamily is not provided — safe to call
 * unconditionally from credential forms that only sometimes support reuse.
 */
export function useOAuthApplications(providerFamily?: string) {
  return useQuery({
    queryKey: ['oauth-applications', providerFamily],
    queryFn: () =>
      apiClient
        .get<OAuthApplication[]>('/oauth-applications', {
          params: { providerFamily },
        })
        .then((r) => r.data),
    enabled: Boolean(providerFamily),
  });
}

export function useCreateOAuthApplicationMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateOAuthApplicationDto) =>
      apiClient.post<OAuthApplication>('/oauth-applications', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['oauth-applications'] });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to save OAuth application') }),
  });
}
