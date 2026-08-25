'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { Company } from '@/types/api';
import type { PaginatedResponse } from '@/types/pagination';
import type { CreateCompanyFormData, UpdateCompanyFormData, CreateCompanyWithOwnerFormData } from '@/lib/schemas/company.schema';
import type { CreateCompanyWithOwnerResponse } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';

export interface CompaniesParams {
  limit?: number;
  offset?: number;
  active?: boolean;
  search?: string;
}

export function useCompanies(params: CompaniesParams = {}) {
  return useQuery({
    queryKey: ['companies', params],
    queryFn: () =>
      apiClient
        .get<PaginatedResponse<Company>>('/companies', { params })
        .then((r) => r.data),
  });
}

export function useCompanyById(companyId: string | null | undefined) {
  return useQuery({
    queryKey: ['companies', 'byId', companyId],
    queryFn: () =>
      apiClient.get<Company>(`/companies/${companyId}`).then((r) => r.data),
    enabled: Boolean(companyId),
    staleTime: 5 * 60 * 1000, // 5 min — company profile rarely changes mid-session
  });
}

export function useCreateCompanyMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateCompanyFormData) =>
      apiClient.post<Company>('/companies/json', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      pushSnack({ type: 'success', message: 'Company created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create company') }),
  });
}

export function useUpdateCompanyMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ companyKey, ...dto }: { companyKey: string } & UpdateCompanyFormData) =>
      apiClient.patch<Company>(`/companies/${companyKey}`, dto).then((r) => r.data),
    onSuccess: (_data, { companyKey }) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['companies', 'byKey', companyKey] });
      pushSnack({ type: 'success', message: 'Company updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update company') }),
  });
}

export function useCreateCompanyWithOwnerMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateCompanyWithOwnerFormData) =>
      apiClient
        .post<CreateCompanyWithOwnerResponse>('/companies/with-owner', dto)
        .then((r) => r.data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      qc.invalidateQueries({ queryKey: ['users'] });
      pushSnack({
        type: data.emailDelivered ? 'success' : 'warning',
        message: data.message,
      });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create company') }),
  });
}

export function useDeleteCompanyMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (companyKey: string) =>
      apiClient.delete(`/companies/${companyKey}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      pushSnack({ type: 'success', message: 'Company deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete company') }),
  });
}
