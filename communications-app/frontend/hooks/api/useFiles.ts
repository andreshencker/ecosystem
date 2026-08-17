'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation } from '@tanstack/react-query';
import axios from 'axios';
import { apiClient } from '@/lib/axios';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MediaInfo {
  key: string;
  companyId: string;
  contentType: string;
  size: number;
  url?: string;
  uploadedAt?: string;
}

export interface StorageFileInfo {
  key: string;
  companyId: string;
  contentType: string;
  size: number;
  fileName?: string;
  uploadedAt?: string;
}

export interface StorageDownloadUrl {
  url: string;
  expiresAt?: string;
}

export interface GenerateReportDto {
  companyId: string;
  templateKey?: string;
  format?: 'pdf';
  variables?: Record<string, unknown>;
}

// ─── Media queries ────────────────────────────────────────────────────────────

export function useMediaInfo(companyId: string | null | undefined, key: string | null | undefined) {
  return useQuery({
    queryKey: ['files', 'media', companyId, key],
    queryFn: () =>
      apiClient
        .get<MediaInfo>('/files/media/info', { params: { companyId, key } })
        .then((r) => r.data),
    enabled: Boolean(companyId) && Boolean(key),
  });
}

// ─── Storage queries ──────────────────────────────────────────────────────────

export function useStorageInfo(companyId: string | null | undefined, key: string | null | undefined) {
  return useQuery({
    queryKey: ['files', 'storage', companyId, key],
    queryFn: () =>
      apiClient
        .get<StorageFileInfo>('/files/storage/info', { params: { companyId, key } })
        .then((r) => r.data),
    enabled: Boolean(companyId) && Boolean(key),
  });
}

export function useStorageDownloadUrl(
  companyId: string | null | undefined,
  key: string | null | undefined,
  options: { expiresInSeconds?: number; fileName?: string } = {},
) {
  return useQuery({
    queryKey: ['files', 'storage', 'download', companyId, key, options],
    queryFn: () =>
      apiClient
        .get<StorageDownloadUrl>('/files/storage/download', {
          params: { companyId, key, ...options },
        })
        .then((r) => r.data),
    enabled: Boolean(companyId) && Boolean(key),
  });
}

// ─── Media mutations ──────────────────────────────────────────────────────────

export function useUploadMediaMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient
        .post<MediaInfo>('/files/media', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data),
    onSuccess: () => pushSnack({ type: 'success', message: 'Media uploaded' }),
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to upload media') }),
  });
}

export function useDeleteMediaMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ companyId, key }: { companyId: string; key: string }) =>
      apiClient.delete('/files/media', { params: { companyId, key } }).then((r) => r.data),
    onSuccess: () => pushSnack({ type: 'success', message: 'Media deleted' }),
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete media') }),
  });
}

// ─── Storage mutations ────────────────────────────────────────────────────────

export function useUploadStorageMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (formData: FormData) =>
      apiClient
        .post<StorageFileInfo>('/files/storage', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data),
    onSuccess: () => pushSnack({ type: 'success', message: 'File uploaded' }),
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to upload file') }),
  });
}

export function useDeleteStorageMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ companyId, key }: { companyId: string; key: string }) =>
      apiClient.delete('/files/storage', { params: { companyId, key } }).then((r) => r.data),
    onSuccess: () => pushSnack({ type: 'success', message: 'File deleted' }),
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete file') }),
  });
}

// ─── Report mutations ─────────────────────────────────────────────────────────

export function useGenerateReportMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: GenerateReportDto) =>
      apiClient.post<Blob>('/files/reports/generate/pdf', dto, { responseType: 'blob' }).then((r) => r.data),
    onSuccess: () => pushSnack({ type: 'success', message: 'Report generated' }),
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to generate report') }),
  });
}
