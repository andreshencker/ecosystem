'use client';

/**
 * Axios instance for communication engine endpoints that require x-api-key.
 *
 * These endpoints use the backend's inline assertApiKey() check in addition to
 * the global JWT guard.  We must send BOTH headers:
 *   - Authorization: Bearer <jwt>  → passes GlobalAuthGuard
 *   - x-api-key: <COMM_API_KEY>    → passes controller-level assertApiKey()
 *
 * Long-term: Phase 4 will migrate engine endpoints to the JWT gateway pattern
 * and this file can be removed (see GlobalAuthGuard TODO).
 */

import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { clearAuthCookie } from '@/lib/auth-cookie';
import { REFRESH_TOKEN_KEY } from '@/lib/constants';
import { writeAuthCookie } from '@/lib/auth-cookie';

const API_URL    = process.env.NEXT_PUBLIC_API_URL    ?? 'http://localhost:3001';
const COMM_KEY   = process.env.NEXT_PUBLIC_COMM_API_KEY ?? '';

export const engineClient = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': COMM_KEY,
  },
  timeout: 15_000,
});

// ─── Request: attach JWT Bearer + debug logging ───────────────────────────────

engineClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (process.env.NODE_ENV === 'development') {
    const companyId =
      (config.params as Record<string, unknown> | undefined)?.companyId ??
      (config.data as Record<string, unknown> | undefined)?.companyId ??
      null;
    console.log(
      '[Engine]', config.method?.toUpperCase(), config.baseURL + (config.url ?? ''),
      companyId ? `| companyId: ${companyId}` : '',
    );
  }
  return config;
});

// ─── Response: handle 401 with token refresh ──────────────────────────────────

let isRefreshing = false;
let queue: Array<{ resolve: (t: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token as string)));
  queue = [];
}

engineClient.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (!error.response || error.response.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    if (original.url === '/auth/refresh') {
      console.warn('[AUTH CLEAR]', { file: 'lib/engine-axios.ts', function: 'responseInterceptor', reason: 'refresh endpoint returned 401 (reuse or invalid)', stack: new Error().stack });
      clearAuthCookie();
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        console.warn('[AUTH REDIRECT]', { file: 'lib/engine-axios.ts', reason: 'refresh 401 — hard redirect to login' });
        window.location.href = '/auth/login';
      }
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return engineClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;

    if (!refreshToken) {
      isRefreshing = false;
      console.warn('[AUTH CLEAR]', { file: 'lib/engine-axios.ts', function: 'responseInterceptor', reason: 'no refresh token in localStorage when 401 received', stack: new Error().stack });
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        console.warn('[AUTH REDIRECT]', { file: 'lib/engine-axios.ts', reason: 'no refresh token — hard redirect to login' });
        window.location.href = '/auth/login';
      }
      return Promise.reject(error);
    }

    try {
      const res = await engineClient.post<{
        accessToken: string;
        refreshToken: string;
        expiresIn?: number;
      }>('/auth/refresh', { refreshToken });
      const { accessToken: newToken, refreshToken: newRefresh, expiresIn } = res.data;
      useAuthStore.getState().setAccessToken(newToken);
      writeAuthCookie(newToken, expiresIn ?? 900);
      if (typeof window !== 'undefined') localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return engineClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      console.warn('[AUTH CLEAR]', { file: 'lib/engine-axios.ts', function: 'responseInterceptor', reason: 'refresh token call failed', refreshError, stack: new Error().stack });
      clearAuthCookie();
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        console.warn('[AUTH REDIRECT]', { file: 'lib/engine-axios.ts', reason: 'refresh failed — hard redirect to login' });
        window.location.href = '/auth/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
