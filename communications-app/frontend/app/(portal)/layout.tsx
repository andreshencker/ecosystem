'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore, readStoredUser } from '@/stores/auth.store';
import { apiClient } from '@/lib/axios';
import { REFRESH_TOKEN_KEY } from '@/lib/constants';
import { writeAuthCookie } from '@/lib/auth-cookie';
import { AppShell } from '@/components/layout';
import { LoadingPage } from '@/components/shared';
import type { User } from '@/types/api';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();
  // Guard against React 18 StrictMode double-invocation of useEffect.
  // Without this, two concurrent /auth/refresh calls fire with the same
  // token; the second arrives after the first has rotated it, triggering
  // the backend's reuse-attack detection and revoking all sessions.
  const didRun = useRef(false);

  useEffect(() => {
    if (didRun.current) return;
    didRun.current = true;

    const { accessToken, user } = useAuthStore.getState();

    // ── Case 1: Already authenticated in memory (SPA navigation, no F5) ──────
    if (accessToken && user) {
      console.log('[PortalLayout] Case 1 — in-memory session', {
        pathname: window.location.pathname,
        mustChangePassword: user.mustChangePassword,
      });
      setIsReady(true);
      return;
    }

    // ── Case 2: F5 / fresh tab — memory is empty, restore from storage ────────
    const refreshToken = typeof window !== 'undefined'
      ? localStorage.getItem(REFRESH_TOKEN_KEY)
      : null;

    if (!refreshToken) {
      router.replace('/auth/login');
      return;
    }

    apiClient
      .post<{ accessToken: string; refreshToken: string; expiresIn?: number }>(
        '/auth/refresh',
        { refreshToken },
      )
      .then(async ({ data }) => {
        const newToken = data.accessToken;

        // Persist the new tokens immediately
        writeAuthCookie(newToken, data.expiresIn ?? 900);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);

        // ── Fast path: restore user from localStorage (no extra round-trip) ──
        const storedUser = readStoredUser();
        if (storedUser) {
          useAuthStore.getState().setAuth(storedUser, newToken);
          setIsReady(true);
          return;
        }

        // ── Fallback: no stored user → fetch from backend ─────────────────────
        // Happens the very first time after the localStorage key was introduced,
        // or if the user cleared site data.
        useAuthStore.getState().setAccessToken(newToken);

        const { data: freshUser } = await apiClient.get<User>('/users/me');
        useAuthStore.getState().setAuth(freshUser, newToken);
        setIsReady(true);
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        router.replace('/auth/login');
      });
  }, [router]);

  // Never render an empty page while restoring — show the loading screen instead.
  if (!isReady) {
    return <LoadingPage />;
  }

  return <AppShell>{children}</AppShell>;
}
