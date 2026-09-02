'use client';

import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/axios';
import { REFRESH_TOKEN_KEY } from '@/lib/constants';
import { clearAuthCookie } from '@/lib/auth-cookie';

export function useAuth() {
  const { user, isAuthenticated, clearAuth } = useAuthStore();

  /**
   * Revokes the Relay session, clears all local credentials and then delegates
   * to Grapifly ID so the ecosystem session is cleared as well.
   */
  async function logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken }).catch(() => undefined);
      }
    } finally {
      clearAuthCookie();
      clearAuth();
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      const grapiflyIdUrl = process.env.NEXT_PUBLIC_GRAPIFLY_ID_URL ?? 'http://localhost:3101';
      window.location.replace(`${grapiflyIdUrl.replace(/\/$/, '')}/auth/logout/relay`);
    }
  }

  return { user, isAuthenticated, logout };
}
