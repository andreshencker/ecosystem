'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { DocumentCatalogue, DocumentFormatContracts } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DocumentCatalogueParams {
  active?: boolean;
  populateDocumentDomain?: boolean;
  limit?: number;
  offset?: number;
}

interface BackendPage<T> { data: T[]; total: number; limit: number; offset: number; }

export interface CreateDocumentCatalogueDto {
  documentDomainCatalogueId: string;
  documentKey: string;
  displayName: string;
  description?: string;
  formatContracts?: DocumentFormatContracts;
  isActive?: boolean;
}

export type UpdateDocumentCatalogueDto = Partial<Omit<CreateDocumentCatalogueDto, 'documentDomainCatalogueId'>> & { isActive?: boolean };

// ─── Queries ──────────────────────────────────────────────────────────────────

export function useDocumentCatalogues(
  documentDomainCatalogueId: string | null | undefined,
  params: DocumentCatalogueParams = {},
) {
  return useQuery({
    queryKey: ['document-catalogue', documentDomainCatalogueId, params],
    queryFn: () =>
      apiClient
        .get<BackendPage<DocumentCatalogue>>('/document-catalogue', {
          params: { documentDomainCatalogueId, ...params },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    enabled: Boolean(documentDomainCatalogueId),
  });
}

export function useDocumentCatalogue(id: string | null | undefined) {
  return useQuery({
    queryKey: ['document-catalogue', id],
    queryFn: () =>
      apiClient.get<DocumentCatalogue>(`/document-catalogue/${id}`).then((r) => r.data),
    enabled: Boolean(id),
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateDocumentCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateDocumentCatalogueDto) =>
      apiClient.post<DocumentCatalogue>('/document-catalogue', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-catalogue'] });
      pushSnack({ type: 'success', message: 'Document created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create document') }),
  });
}

export function useUpdateDocumentCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateDocumentCatalogueDto) =>
      apiClient.patch<DocumentCatalogue>(`/document-catalogue/${id}`, dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-catalogue'] });
      pushSnack({ type: 'success', message: 'Document updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update document') }),
  });
}

export function useDeleteDocumentCatalogueMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (id: string) =>
      apiClient.delete(`/document-catalogue/${id}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['document-catalogue'] });
      pushSnack({ type: 'success', message: 'Document deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete document') }),
  });
}

// POST /preview/documents/structure/pdf → PDF Blob (inline, no persistence)
export function usePreviewDocumentStructurePdfMutation() {
  return useMutation({
    mutationFn: ({ companyId, canonicalKey }: { companyId: string; canonicalKey: string }) =>
      apiClient
        .post<Blob>(
          '/preview/documents/structure/pdf',
          { companyId, canonicalKey },
          { responseType: 'blob', timeout: 60_000 },
        )
        .then((r) => r.data),
  });
}
