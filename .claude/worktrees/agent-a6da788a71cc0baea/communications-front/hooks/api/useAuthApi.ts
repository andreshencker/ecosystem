'use client';

import { useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/axios';
import type { AuthResponse } from '@/types/api';

interface LoginDto { email: string; password: string; }
interface RegisterDto { email: string; password: string; firstName?: string; lastName?: string; }
interface ForgotPasswordDto { email: string; }
interface ResetPasswordDto { token: string; newPassword: string; }
interface RefreshDto { refreshToken: string; }

export function useLoginMutation() {
  return useMutation({
    mutationFn: (dto: LoginDto) =>
      apiClient.post<AuthResponse>('/auth/login', dto).then(r => r.data),
  });
}

export function useRegisterMutation() {
  return useMutation({
    mutationFn: (dto: RegisterDto) =>
      apiClient.post<AuthResponse>('/auth/register', dto).then(r => r.data),
  });
}

export function useForgotPasswordMutation() {
  return useMutation({
    mutationFn: (dto: ForgotPasswordDto) =>
      apiClient.post('/auth/forgot-password', dto).then(r => r.data),
  });
}

export function useResetPasswordMutation() {
  return useMutation({
    mutationFn: (dto: ResetPasswordDto) =>
      apiClient.post('/auth/reset-password', dto).then(r => r.data),
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: (dto: RefreshDto) =>
      apiClient.post('/auth/logout', dto).then(r => r.data),
  });
}

export function useRefreshMutation() {
  return useMutation({
    mutationFn: (dto: RefreshDto) =>
      apiClient.post<AuthResponse>('/auth/refresh', dto).then(r => r.data),
  });
}
