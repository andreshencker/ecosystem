'use client';

import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/axios';
import { REFRESH_TOKEN_KEY } from '@/lib/constants';
import { writeAuthCookie, clearAuthCookie } from '@/lib/auth-cookie';
import { useRouter } from 'next/navigation';
import { getLandingPage } from '@/config/rbac/role-config';
import type { AuthResponse } from '@/types/api';

export function useAuth() {
  const { user, isAuthenticated, setAuth, clearAuth } = useAuthStore();
  const router = useRouter();

  /**
   * Authenticates the user and persists the session.
   * Follows the mandatory order from Form-Behaviour.md §3.6:
   *   1. Zustand store (setAuth)
   *   2. localStorage (refresh token)
   *   3. Cookie (access token — required by middleware)
   *   4. Redirect (last, only after all persistence succeeds)
   *
   * If mustChangePassword is true, redirects to /auth/change-password
   * instead of the role landing page (DEC-013).
   *
   * Throws on API error so the login form can catch and display the message.
   */
  async function login(email: string, password: string): Promise<void> {
    const { data } = await apiClient.post<AuthResponse>('/auth/login', { email, password });
    setAuth(data.user, data.accessToken);
    localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
    writeAuthCookie(data.accessToken, data.expiresIn ?? 900);

    const routeTarget = data.user.mustChangePassword
      ? '/auth/change-password'
      : getLandingPage(data.user.role);

    console.log('[useAuth.login] user.mustChangePassword =', data.user.mustChangePassword);
    console.log('[useAuth.login] route target =', routeTarget);

    router.push(routeTarget);
  }

  /**
   * Registers a new company and owner account.
   * Returns the server's success message; never auto-logs in.
   * The caller is responsible for redirecting to /auth/login?registered=true.
   *
   * Throws on API error so the registration form can catch and display the message.
   */
  async function register(dto: {
    companyName: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }): Promise<{ message: string }> {
    const { data } = await apiClient.post<{ message: string }>('/auth/register', dto);
    return data;
  }

  /**
   * Logs the user out. Fires the API call fire-and-forget so the local
   * session is always cleared even if the server is unreachable.
   * See Authentication.md §6 and Form-Behaviour.md §7.4.
   */
  async function logout(): Promise<void> {
    try {
      const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);
      if (refreshToken) {
        apiClient.post('/auth/logout', { refreshToken }).catch(() => undefined);
      }
    } finally {
      clearAuthCookie();
      clearAuth();
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      router.push('/auth/login');
    }
  }

  return { user, isAuthenticated, login, register, logout };
}
