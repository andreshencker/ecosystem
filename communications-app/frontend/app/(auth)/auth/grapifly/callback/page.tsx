'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';
import { writeAuthCookie } from '@/lib/auth-cookie';
import { REFRESH_TOKEN_KEY } from '@/lib/constants';
import { getLandingPage } from '@/config/rbac/role-config';
import type { AuthResponse } from '@/types/api';

function GrapiflyCallbackContent() {
  const params = useSearchParams();
  const router = useRouter();
  const setAuth = useAuthStore((state) => state.setAuth);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const code = params.get('code');
    if (!code) {
      setError('The Grapifly sign-in code is missing.');
      return;
    }
    apiClient.post<AuthResponse>('/auth/grapifly', { code })
      .then(({ data }) => {
        setAuth(data.user, data.accessToken);
        localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
        writeAuthCookie(data.accessToken, data.expiresIn ?? 900);
        router.replace(getLandingPage(data.user.role));
      })
      .catch((reason) => {
        setError(reason?.response?.data?.message ?? 'Your Grapifly account does not currently have access to Relay.');
      });
  }, [params, router, setAuth]);

  return (
    <Box textAlign="center" py={5} px={3}>
      {error ? (
        <>
          <Typography variant="h5" fontWeight={700}>Relay access unavailable</Typography>
          <Typography color="text.secondary" mt={1.5} mb={3}>{error}</Typography>
          <Button variant="contained" onClick={() => window.location.assign('http://localhost:3100/home')}>Return to Grapifly</Button>
        </>
      ) : (
        <><CircularProgress /><Typography mt={2} color="text.secondary">Connecting your Grapifly ID to Relay…</Typography></>
      )}
    </Box>
  );
}

export default function GrapiflyCallbackPage() {
  return <Suspense><GrapiflyCallbackContent /></Suspense>;
}
