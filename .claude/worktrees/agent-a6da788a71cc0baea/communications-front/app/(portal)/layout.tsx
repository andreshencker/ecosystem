'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth.store';
import { apiClient } from '@/lib/axios';
import { REFRESH_TOKEN_KEY } from '@/lib/constants';
import { AppShell } from '@/components/layout';
import { LoadingPage } from '@/components/shared';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const accessToken = useAuthStore.getState().accessToken;

    if (accessToken) {
      setIsReady(true);
      return;
    }

    const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY);

    if (!refreshToken) {
      router.replace('/auth/login');
      return;
    }

    apiClient
      .post<{ accessToken: string; refreshToken: string }>('/auth/refresh', { refreshToken })
      .then(({ data }) => {
        useAuthStore.getState().setAccessToken(data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        setIsReady(true);
      })
      .catch(() => {
        useAuthStore.getState().clearAuth();
        router.replace('/auth/login');
      });
  }, [router]);

  if (!isReady) {
    return <LoadingPage />;
  }

  return <AppShell>{children}</AppShell>;
}
