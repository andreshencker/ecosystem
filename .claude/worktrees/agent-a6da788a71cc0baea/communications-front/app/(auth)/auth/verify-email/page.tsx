'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { apiClient } from '@/lib/axios';
import { LoadingPage } from '@/components/shared/LoadingPage';

type VerifyState = 'loading' | 'success' | 'error';

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [state, setState] = useState<VerifyState>('loading');

  useEffect(() => {
    if (!token) {
      setState('error');
      return;
    }

    let cancelled = false;

    apiClient
      .get('/auth/verify-email', { params: { token } })
      .then(() => {
        if (!cancelled) setState('success');
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          // Log for debugging; always show the expiry message to the user
          if (!axios.isAxiosError(e)) {
            console.error('Verify email unexpected error:', e);
          }
          setState('error');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [token]);

  if (state === 'loading') {
    return <LoadingPage />;
  }

  return (
    <Stack spacing={2}>
      <Typography variant="h5" align="center" fontWeight={600}>
        Communication Portal
      </Typography>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            <Typography variant="h6" align="center">
              Email verification
            </Typography>

            {state === 'success' && (
              <Alert severity="success">
                Email verified successfully! You can now{' '}
                <Link component={NextLink} href="/auth/login">
                  sign in
                </Link>
                .
              </Alert>
            )}

            {state === 'error' && (
              <Alert severity="error">
                This verification link has expired. Please register again.
              </Alert>
            )}

            <Box textAlign="center">
              <Link component={NextLink} href="/auth/login" variant="body2">
                Back to sign in
              </Link>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense>
      <VerifyEmailContent />
    </Suspense>
  );
}
