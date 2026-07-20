import axios from 'axios';
import { useAuthStore } from '@/stores/auth.store';
import { REFRESH_TOKEN_KEY } from '@/lib/constants';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

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

// ─── Request interceptor — attach Bearer token ──────────────────────────────

apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
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
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
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
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') window.location.href = '/auth/login';
      return Promise.reject(error);
    }

    try {
      const res = await apiClient.post<{ accessToken: string; refreshToken: string }>(
        '/auth/refresh',
        { refreshToken },
      );
      const { accessToken: newToken, refreshToken: newRefresh } = res.data;
      useAuthStore.getState().setAccessToken(newToken);
      if (typeof window !== 'undefined') {
        localStorage.setItem(REFRESH_TOKEN_KEY, newRefresh);
      }
      processQueue(null, newToken);
      original.headers.Authorization = `Bearer ${newToken}`;
      return apiClient(original);
    } catch (refreshError) {
      processQueue(refreshError, null);
      useAuthStore.getState().clearAuth();
      if (typeof window !== 'undefined') {
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.href = '/auth/login';
      }
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
