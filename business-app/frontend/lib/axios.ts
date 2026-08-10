import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { REFRESH_TOKEN_KEY } from '@/lib/constants';
import { writeAuthCookie, clearAuthCookie } from '@/lib/auth-cookie';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3004';

export const apiClient = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
});

// ─── Refresh queue — prevents concurrent refresh calls ──────────────────────

let isRefreshing = false;
let queue: Array<{ resolve: (token: string) => void; reject: (e: unknown) => void }> = [];

function processQueue(error: unknown, token: string | null) {
  queue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token as string);
  });
  queue = [];
}

// ─── Request interceptor — attach Bearer token + debug logging ──────────────

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  if (process.env.NODE_ENV === 'development') {
    const companyId =
      (config.params as Record<string, unknown> | undefined)?.companyId ??
      (config.data as Record<string, unknown> | undefined)?.companyId ??
      null;
    console.log(
      '[API]', config.method?.toUpperCase(), config.baseURL + (config.url ?? ''),
      companyId ? `| companyId: ${companyId}` : '',
    );
  }
  return config;
});

// ─── Response interceptor — handle 401 with token refresh ───────────────────

apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config as typeof error.config & { _retry?: boolean };

    if (!error.response || error.response.status !== 401 || original._retry) {
      return Promise.reject(error);
    }

    // Avoid infinite loop on the refresh endpoint itself
    if (original.url === '/auth/refresh') {
      console.warn('[AUTH CLEAR]', { file: 'lib/axios.ts', function: 'responseInterceptor', reason: 'refresh endpoint returned 401 (reuse or invalid)', stack: new Error().stack });
      clearAuthCookie();
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        console.warn('[AUTH REDIRECT]', { file: 'lib/axios.ts', reason: 'refresh 401 — hard redirect to login' });
        window.location.href = '/auth/login';
      }
      return Promise.reject(error);
    }

    // If already refreshing, queue this request
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        queue.push({ resolve, reject });
      }).then((token) => {
        original.headers.Authorization = `Bearer ${token}`;
        return apiClient(original);
      });
    }

    original._retry = true;
    isRefreshing = true;

    const refreshToken =
      typeof window !== 'undefined' ? localStorage.getItem(REFRESH_TOKEN_KEY) : null;

    if (!refreshToken) {
      isRefreshing = false;
      console.warn('[AUTH CLEAR]', { file: 'lib/axios.ts', function: 'responseInterceptor', reason: 'no refresh token in localStorage when 401 received', stack: new Error().stack });
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        console.warn('[AUTH REDIRECT]', { file: 'lib/axios.ts', reason: 'no refresh token — hard redirect to login' });
        window.location.href = '/auth/login';
      }
      return Promise.reject(error);
    }

    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string; expiresIn?: number }>(
        '/auth/refresh',
        { refreshToken },
      );
      const { accessToken: newToken, refreshToken: newRefresh, expiresIn } = res.data;
      useAuthStore.getState().setAccessToken(newToken);
      writeAuthCookie(newToken, expiresIn ?? 900);
      if (typeof window !== 'undefined') {
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
      }
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      console.warn('[AUTH CLEAR]', { file: 'lib/axios.ts', function: 'responseInterceptor', reason: 'refresh token call failed', refreshError, stack: new Error().stack });
      clearAuthCookie();
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        console.warn('[AUTH REDIRECT]', { file: 'lib/axios.ts', reason: 'refresh failed — hard redirect to login' });
        window.location.href = '/auth/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
