'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/axios';
import type {
  CompanyIntegration,
  CompanyIntegrationPlatformView,
  CompanyIntegrationWithToken,
} from '@/types/api';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompanyIntegrationParams {
  active?: boolean;
  limit?: number;
  offset?: number;
}

interface BackendPage<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface CompanyIntegrationsPaginatedResponse {
  items: CompanyIntegration[];
  total: number;
}

export interface CreateCompanyIntegrationDto {
  companyId: string;
  integrationKey: string;
  displayName: string;
  description?: string;
  environment?: 'development' | 'staging' | 'production';
  expiresAt?: string | null;
}

export type UpdateCompanyIntegrationDto = Partial<{
  displayName: string;
  description: string;
  environment: 'development' | 'staging' | 'production';
  isActive: boolean;
  expiresAt: string | null;
}>;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useCompanyIntegrations(
  companyId: string | null | undefined,
  params: CompanyIntegrationParams = {},
) {
  return useQuery({
    queryKey: ['company-integrations', companyId, params],
    queryFn: () =>
      apiClient
        .get<BackendPage<CompanyIntegration>>('/company-integrations', {
          params: { companyId, ...params },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    enabled: Boolean(companyId),
  });
}

// ── Platform Admin query ─────────────────────────────────────────────────────

export interface PlatformIntegrationParams {
  search?: string;
  companyId?: string;
  environment?: string;
  active?: boolean;
  expired?: boolean;
  neverUsed?: boolean;
  limit?: number;
  offset?: number;
}

export interface PlatformIntegrationsPaginatedResponse {
  items: CompanyIntegrationPlatformView[];
  total: number;
}

export function useCompanyIntegrationsPlatform(params: PlatformIntegrationParams = {}) {
  return useQuery({
    queryKey: ['company-integrations', 'platform', params],
    queryFn: () =>
      apiClient
        .get<BackendPage<CompanyIntegrationPlatformView>>('/company-integrations/modules/all', { params })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateCompanyIntegrationMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateCompanyIntegrationDto) =>
      apiClient
        .post<CompanyIntegrationWithToken>('/company-integrations', dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-integrations'] });
      // Success snack deferred to caller — it needs to show the token modal first
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create integration') }),
  });
}

export function useUpdateCompanyIntegrationMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateCompanyIntegrationDto) =>
      apiClient
        .patch<CompanyIntegration>(`/company-integrations/${id}`, dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-integrations'] });
      pushSnack({ type: 'success', message: 'Integration updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update integration') }),
  });
}

export function useDeleteCompanyIntegrationMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/company-integrations/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-integrations'] });
      pushSnack({ type: 'success', message: 'Integration deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete integration') }),
  });
}

export function useRotateIntegrationTokenMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient
        .post<CompanyIntegrationWithToken>(`/company-integrations/${id}/rotate-token`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-integrations'] });
      // Token modal shown by caller
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to rotate token') }),
  });
}

export function useDeactivateCompanyIntegrationMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient
        .post<CompanyIntegration>(`/company-integrations/${id}/deactivate`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-integrations'] });
      pushSnack({ type: 'success', message: 'Integration deactivated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to deactivate integration') }),
  });
}

export function useActivateCompanyIntegrationMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient
        .post<CompanyIntegration>(`/company-integrations/${id}/activate`)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['company-integrations'] });
      pushSnack({ type: 'success', message: 'Integration activated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to activate integration') }),
  });
}
