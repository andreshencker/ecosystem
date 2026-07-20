'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engineClient } from '@/lib/engine-axios';
import type { CompanyTheme } from '@/types/api';
import type { ThemeFormValues } from '@/lib/schemas/theme.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CompanyThemesParams {
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

export interface CompanyThemesPaginatedResponse {
  items: CompanyTheme[];
  total: number;
}

export type CreateCompanyThemeDto = Omit<ThemeFormValues, 'isDefault' | 'isActive'> & {
  companyId: string;
  isDefault?: boolean;
  isActive?: boolean;
};

export type UpdateCompanyThemeDto = Partial<ThemeFormValues>;

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useCompanyThemes(
  companyId: string | null | undefined,
  params: CompanyThemesParams = {},
) {
  return useQuery({
    queryKey: ['company-themes', companyId, params],
    queryFn: () =>
      engineClient
        .get<BackendPage<CompanyTheme>>('/company-themes', {
          params: { companyId, ...params },
        })
        .then((r) => ({
          items: r.data.data ?? [],
          total: r.data.total ?? 0,
        })),
    enabled: Boolean(companyId),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────
// These mutations define only the API call (mutationFn).
// Success snacks, query invalidation, and drawer close are handled
// by the caller via useCrudFeedback (Form-Behaviour.md §8.3).
// Error toasts are handled globally by queryClient mutationCache.onError.

export function useCreateCompanyThemeMutation() {
  return useMutation({
    mutationFn: (dto: CreateCompanyThemeDto) =>
      engineClient
        .post<CompanyTheme>('/company-themes', dto)
        .then((r) => r.data),
  });
}

export function useUpdateCompanyThemeMutation() {
  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateCompanyThemeDto) =>
      engineClient
        .put<CompanyTheme>(`/company-themes/${id}`, dto)
        .then((r) => r.data),
  });
}

export function useDeleteCompanyThemeMutation() {
  return useMutation({
    mutationFn: (id: string) =>
      engineClient.delete(`/company-themes/${id}`).then((r) => r.data),
  });
}

export function useSetDefaultThemeMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      engineClient
        .put<CompanyTheme>(`/company-themes/${id}`, { isDefault: true })
        .then((r) => r.data),
    onSuccess: (_data, _id, _ctx) => {
      qc.invalidateQueries({ queryKey: ['company-themes'] });
    },
  });
}
