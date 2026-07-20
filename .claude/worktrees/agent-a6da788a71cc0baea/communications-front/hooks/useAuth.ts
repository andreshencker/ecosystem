'use client';

import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/axios';
import { REFRESH_TOKEN_KEY } from '@/lib/constants';
import { useRouter } from 'next/navigation';
import type { AuthResponse } from '@/types/api';

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();

  async function login(email: string, password: string): Promise<void> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    setAuth(data.user, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    router.push('/dashboard');
  }

  async function logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) await apiClient.post('/auth/logout', { refreshToken });
    } finally {
      clearAuth();
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      router.push('/auth/login');
    }
  }

  return { user, isAuthenticated, login, logout };
}
