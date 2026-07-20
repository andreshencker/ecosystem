'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { Business } from '@/types/api';
import type { UpdateCompanyFormData } from '@/lib/schemas/company.schema';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

const QUERY_KEY = ['company', 'own'];

/** Fetches the authenticated user's own Business via GET /company. */
export function useOwnCompany() {
  return useQuery<Business | null>({
    queryKey: QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await apiClient.get<Business>('/company');
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.response?.status === 501) return null;
        throw err;
      }
    },
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}

/** PATCH /company — updates the authenticated user's Business. */
export function useUpdateCompany() {
  const qc        = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: async (data: Partial<UpdateCompanyFormData>) => {
      const res = await apiClient.patch<Business>('/company', data);
      return res.data;
    },
    onSuccess: (updated) => {
      qc.setQueryData(QUERY_KEY, updated);
      pushSnack({ type: 'success', message: 'Business settings saved.' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to save business settings') }),
  });
}

/** @deprecated Use useOwnCompany() instead. Kept for AppShell topbar compat. */
export function useCompanyById(companyId: string | null | undefined) {
  return useQuery<Business | null>({
    queryKey: ['companies', 'byId', companyId],
    queryFn: async () => {
      try {
        const res = await apiClient.get<Business>('/company');
        return res.data;
      } catch (err: any) {
        if (err?.response?.status === 404 || err?.response?.status === 501) return null;
        throw err;
      }
    },
    enabled: Boolean(companyId),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
