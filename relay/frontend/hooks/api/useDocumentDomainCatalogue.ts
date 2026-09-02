'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { DocumentDomainCatalogue, DocumentFormat } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentDomainCatalogueParams {
  active?: boolean;
  limit?: number;
  offset?: number;
}

interface BackendPage<T> { data: T[]; total: number; limit: number; offset: number; }

export interface CreateDocumentDomainCatalogueDto {
  companyId: string;
  domainKey: string;
  displayName: string;
  description?: string;
  domainCategory: string;
  allowedFormats?: DocumentFormat[];
  isActive?: boolean;
}

export type UpdateDocumentDomainCatalogueDto = Partial<Omit<CreateDocumentDomainCatalogueDto, 'companyId'>> & { isActive?: boolean };

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useDocumentDomainCatalogues(
  companyId: string | null | undefined,
  params: DocumentDomainCatalogueParams = {},
) {
  return useQuery({
    queryKey: ['document-domain-catalogue', companyId, params],
    queryFn: () =>
      apiClient
        .get<BackendPage<DocumentDomainCatalogue>>('/document-domain-catalogue', {
          params: { companyId, ...params },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    enabled: Boolean(companyId),
  });
}

export function useDocumentDomainCatalogue(id: string | null | undefined) {
  return useQuery({
    queryKey: ['document-domain-catalogue', id],
    queryFn: () =>
      apiClient.get<DocumentDomainCatalogue>(`/document-domain-catalogue/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateDocumentDomainCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateDocumentDomainCatalogueDto) =>
      apiClient.post<DocumentDomainCatalogue>('/document-domain-catalogue', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Document domain created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create document domain') }),
  });
}

export function useUpdateDocumentDomainCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateDocumentDomainCatalogueDto) =>
      apiClient.patch<DocumentDomainCatalogue>(`/document-domain-catalogue/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Document domain updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update document domain') }),
  });
}

export function useDeleteDocumentDomainCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/document-domain-catalogue/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-domain-catalogue'] });
      pushSnack({ type: 'success', message: 'Document domain deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete document domain') }),
  });
}
