'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
interface RefreshDto { refreshToken: string; }

export function useLogoutMutation() {
  return useMutation({
    mutationFn: (dto: RefreshDto) =>
      apiClient.post('/auth/logout', dto).then(r => r.data),
  });
}

export function useRefreshMutation() {
  return useMutation({
    mutationFn: (dto: RefreshDto) =>
      apiClient.post('/auth/refresh', dto).then(r => r.data),
  });
}
