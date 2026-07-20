'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { User } from '@/types/api';
import { useUIStore } from '@/stores/ui.store';
import { useAuthStore } from '@/stores/auth.store';
import { extractApiMessage } from '@/lib/mapApiError';
import type { UpdateUserFormData } from '@/lib/schemas/user.schema';

// ─── Params & response types ─────────────────────────────────────────────────

export interface UsersParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  /** Scopes the listing to this company (sent to GET /users?companyId=). */
  companyId?: string;
}

export interface UsersPaginatedResponse {
  items: User[];
  total: number;
  page: number;
  limit: number;
}

// ─── Users queries ────────────────────────────────────────────────────────────

export function useUsers(
  params: UsersParams = {},
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['users', params],
    queryFn: () =>
      apiClient
        .get<UsersPaginatedResponse>('/users', { params })
        .then((r) => r.data),
    enabled: options?.enabled ?? true,
  });
}

export function useMe() {
  return useQuery({
    queryKey: ['users', 'me'],
    queryFn: () =>
      apiClient.get<User>('/users/me').then((r) => r.data),
  });
}

// ─── User mutations ───────────────────────────────────────────────────────────

export function useUpdateUserMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: ({ id, ...dto }: { id: string } & UpdateUserFormData) =>
      apiClient
        .patch<User>(`/users/${id}`, dto)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      pushSnack({ type: 'success', message: 'User updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update user') }),
  });
}

export function useUpdateMeMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: { firstName?: string; lastName?: string; avatarUrl?: string | null }) =>
      apiClient.patch<User>('/users/me', dto).then((r) => r.data),
    onSuccess: (updatedUser) => {
      const { setAuth, accessToken } = useAuthStore.getState();
      if (accessToken) setAuth(updatedUser, accessToken);
      qc.invalidateQueries({ queryKey: ['users', 'me'] });
      pushSnack({ type: 'success', message: 'Profile updated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to update profile') }),
  });
}

export function useChangePasswordMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (dto: { currentPassword: string; newPassword: string }) =>
      apiClient.patch('/users/me/password', dto).then((r) => r.data),
    onSuccess: () => pushSnack({ type: 'success', message: 'Password changed' }),
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to change password') }),
  });
}

export function useDeleteUserMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.delete(`/users/${userId}`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      pushSnack({ type: 'success', message: 'User deleted successfully.' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to delete user') }),
  });
}

export function useAdminPasswordResetMutation() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  return useMutation({
    mutationFn: (userId: string) =>
      apiClient
        .post<{ message: string }>(`/users/${userId}/send-password-reset`)
        .then((r) => r.data),
    onSuccess: (data) =>
      pushSnack({ type: 'success', message: data.message ?? 'Password reset email sent.' }),
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to send password reset') }),
  });
}

export function useDeactivateUserMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.patch(`/users/${userId}/deactivate`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      pushSnack({ type: 'success', message: 'User deactivated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to deactivate user') }),
  });
}

export function useReactivateUserMutation() {
  const qc = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);
  return useMutation({
    mutationFn: (userId: string) =>
      apiClient.patch(`/users/${userId}/reactivate`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      pushSnack({ type: 'success', message: 'User reactivated' });
    },
    onError: (error) =>
      pushSnack({ type: 'error', message: extractApiMessage(error, 'Failed to reactivate user') }),
  });
}

