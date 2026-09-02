'use client';
import { extractApiMessage } from '@/lib/mapApiError';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { Channel } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PlatformChannelParams {
  limit?: number;
  offset?: number;
  active?: boolean;
}

// Backend returns { data: T[], total, limit, offset }
interface BackendPage<T> { data: T[]; total: number; limit: number; offset: number; }

export interface PlatformChannelsPaginatedResponse {
  items: Channel[];
  total: number;
}

export interface CreateChannelDto {
  channelKey: string;
  displayName: string;
  description?: string;
  contentFormat: 'html' | 'text' | 'binary';
  supportsTemplates: boolean;
  supportsFiles: boolean;
  isActive?: boolean;
}

export interface UpdateChannelDto {
  channelKey: string;
  displayName?: string;
  description?: string;
  contentFormat?: 'html' | 'text' | 'binary';
  supportsTemplates?: boolean;
  supportsFiles?: boolean;
  isActive?: boolean;
}

// ─── Queries ──────────────────────────────────────────────────────────────────

export function usePlatformChannels(params: PlatformChannelParams = {}) {
  const { limit = 100, offset = 0, ...rest } = params;
  return useQuery({
    queryKey: ['modules-channels', { limit, offset, ...rest }],
    queryFn: () =>
      apiClient
        .get<BackendPage<Channel>>('/channels', {
          params: { limit, offset, ...rest },
        })
        .then((r) => ({ items: r.data.data ?? [], total: r.data.total ?? 0 })),
    staleTime: 2 * 60 * 1_000,
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

export function useCreateChannelMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: CreateChannelDto) =>
      apiClient.post<Channel>('/channels', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules-channels'] });
      qc.invalidateQueries({ queryKey: ['channels'] });
      pushSnack({ type: 'success', message: 'Channel created' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to create channel') }),
  });
}

export function useUpdateChannelMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: UpdateChannelDto) =>
      apiClient.put<Channel>('/channels', dto).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules-channels'] });
      qc.invalidateQueries({ queryKey: ['channels'] });
      pushSnack({ type: 'success', message: 'Channel updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update channel') }),
  });
}

export function useDeleteChannelMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (channelKey: string) =>
      apiClient.delete('/channels', { params: { channelKey } }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['modules-channels'] });
      qc.invalidateQueries({ queryKey: ['channels'] });
      pushSnack({ type: 'success', message: 'Channel deleted' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete channel') }),
  });
}

export function useToggleChannelMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ channelKey, isActive }: { channelKey: string; isActive: boolean }) =>
      apiClient.put<Channel>('/channels', { channelKey, isActive }).then((r) => r.data),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['modules-channels'] });
      qc.invalidateQueries({ queryKey: ['channels'] });
      pushSnack({ type: 'success', message: `Channel ${vars.isActive ? 'activated' : 'deactivated'}` });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to toggle channel') }),
  });
}
