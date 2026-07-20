'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/axios';
import type { Company, CompanySmtpConfig } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';


// ─── Own company ─────────────────────────────────────────────────────────────

export function useOwnCompany() {
  return useQuery({
    queryKey: ['company', 'own'],
    queryFn: () => apiClient.get<Company>('/company').then((r) => r.data),
  });
}

export function useUpdateCompanyMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: Partial<Company>) =>
      apiClient.patch<Company>('/company', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company', 'own'] });
      pushSnack({ type: 'success', message: 'Company settings saved' });
    },
    onError: (error) => pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to save company settings') }),
  });
}

// ─── Company SMTP ─────────────────────────────────────────────────────────────

export function useCompanySmtp() {
  return useQuery({
    queryKey: ['company', 'smtp'],
    queryFn: () =>
      apiClient.get<CompanySmtpConfig>('/company/smtp').then((r) => r.data),
  });
}

export interface UpdateSmtpDto {
  fromEmail?: string;
  fromName?: string;
  host?: string;
  port?: number;
  secure?: boolean;
  user?: string;
  pass?: string;
}

export function useUpdateSmtpMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: UpdateSmtpDto) =>
      apiClient.patch<CompanySmtpConfig>('/company/smtp', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company', 'smtp'] });
      pushSnack({ type: 'success', message: 'SMTP settings saved' });
    },
    onError: (error) => pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to save SMTP settings') }),
  });
}

export function useTestSmtpMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: () =>
      apiClient
        .post<{ ok: boolean; message: string }>('/company/smtp/test')
        .then((r) => r.data),
    onSuccess: (data) => {
      if (data.ok) {
        pushSnack({ type: 'success', message: data.message });
      } else {
        pushSnack({ type: 'error', message: data.message });
      }
    },
    onError: (error) => pushSnack({ type: 'error', message: extractApiMessage(error, 'SMTP test failed') }),
  });
}
