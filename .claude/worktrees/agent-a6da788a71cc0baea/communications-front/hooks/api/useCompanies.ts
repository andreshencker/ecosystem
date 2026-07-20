'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/axios';
import type { Company } from '@/types/api';
import type { PaginatedResponse } from '@/types/pagination';
import type { CreateCompanyFormData, UpdateCompanyFormData } from '@/lib/schemas/company.schema';
import { useUIStore } from '@/stores/ui.store';

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
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as { message?: string })?.message ?? error.message)
        : 'Failed to create company.';
      pushSnack({ type: 'error', message });
    },
  });
}

export function useUpdateCompanyMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({
      companyKey,
      ...dto
    }: { companyKey: string } & UpdateCompanyFormData) =>
      apiClient
        .patch<Company>(`/companies/${companyKey}`, dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['companies'] });
      pushSnack({ type: 'success', message: 'Company updated' });
    },
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as { message?: string })?.message ?? error.message)
        : 'Failed to update company.';
      pushSnack({ type: 'error', message });
    },
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
    onError: (error) => {
      const message = axios.isAxiosError(error)
        ? ((error.response?.data as { message?: string })?.message ?? error.message)
        : 'Failed to delete company.';
      pushSnack({ type: 'error', message });
    },
  });
}
