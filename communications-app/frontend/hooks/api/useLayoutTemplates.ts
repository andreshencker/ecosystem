'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { engineClient } from '@/lib/engine-axios';
import type { LayoutTemplate } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LayoutTemplatesParams {
  templateType?: 'email' | 'pdf';
  active?: boolean;
  includeHtml?: boolean;
  limit?: number;
  offset?: number;
}

export interface ThemeSummary {
  themeId: string;
  name: string;
  isActive: boolean;
  isDefault: boolean;
}

export interface LayoutTemplatesByCompanyResponse {
  templates: LayoutTemplate[];
  themes: ThemeSummary[];
  total: number;
}

export interface CreateLayoutTemplateDto {
  companyThemeId: string;
  templateType: 'email' | 'pdf';
  key: string;
  name: string;
  html: string;
  css?: string;
  requiredVariables?: string[];
  optionalVariables?: string[];
  isDefault?: boolean;
  isActive?: boolean;
}

export type UpdateLayoutTemplateDto = Partial<
  Omit<CreateLayoutTemplateDto, 'companyThemeId' | 'templateType' | 'key'>
>;

// ─── Queries ──────────────────────────────────────────────────────────────────

// GET /layout-templates/by-company — returns { companyId, themes, templates, total }
export function useLayoutTemplates(
  companyId: string | null | undefined,
  params: LayoutTemplatesParams = {},
) {
  return useQuery({
    queryKey: ['layout-templates', companyId, params],
    queryFn: () =>
      engineClient
        .get('/layout-templates/by-company', {
          params: { companyId, populateTheme: true, ...params },
        })
        .then((r) => ({
          templates: (r.data.templates ?? []) as LayoutTemplate[],
          themes: (r.data.themes ?? []) as ThemeSummary[],
          total: (r.data.total ?? 0) as number,
        })),
    enabled: Boolean(companyId),
  });
}

// GET /layout-templates/:id — returns { layout, theme, company }
export function useLayoutTemplate(id: string | null | undefined) {
  return useQuery({
    queryKey: ['layout-templates', 'single', id],
    queryFn: () =>
      engineClient
        .get(`/layout-templates/${id}`)
        .then((r) => (r.data.layout ?? r.data) as LayoutTemplate),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateLayoutTemplateMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateLayoutTemplateDto) =>
      engineClient.post<LayoutTemplate>('/layout-templates', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['layout-templates'] });
      pushSnack({ type: 'success', message: 'Template created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create template') }),
  });
}

export function useUpdateLayoutTemplateMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateLayoutTemplateDto) =>
      engineClient.patch<LayoutTemplate>(`/layout-templates/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['layout-templates'] });
      pushSnack({ type: 'success', message: 'Template updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update template') }),
  });
}

export function useDeleteLayoutTemplateMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      engineClient.delete(`/layout-templates/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['layout-templates'] });
      pushSnack({ type: 'success', message: 'Template deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete template') }),
  });
}

// POST /preview/layout/html — returns rendered HTML string
export function usePreviewLayoutHtmlMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (layoutTemplateId: string) =>
      engineClient
        .post<string>(
          '/preview/layout/html',
          { layoutTemplateId },
          { headers: { Accept: 'text/html, */*' }, responseType: 'text' },
        )
        .then((r) => r.data as unknown as string),
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Preview failed') }),
  });
}
