'use client';

import { Suspense, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { apiClient } from '@/lib/axios';
import { LoadingPage } from '@/components/shared/LoadingPage';

type VerifyState = 'loading' | 'success' | 'invalid' | 'expired';

function VerifyEmailContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();
  const token        = searchParams.get('token');

  const [state, setState] = useState<VerifyState>(token ? 'loading' : 'invalid');

  useEffect(() => {
    if (!token) return;

    let cancelled = false;

    apiClient
      .get('/auth/verify-email', { params: { token } })
      .then(() => {
        if (!cancelled) {
          setState('success');
          // Redirect to login with a success flag so the login page can display
          // the "Email verified" confirmation banner.
          router.replace('/auth/login?verified=true');
        }
      })
      .catch(() => {
        if (!cancelled) setState('expired');
      });

    return () => { cancelled = true; };
  }, [token, router]);

  if (state === 'loading' || state === 'success') {
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

            {state === 'expired' && (
              <Alert severity="warning">
                <AlertTitle>Link expired</AlertTitle>
                This verification link has expired or has already been used.
                Please sign in to request a new verification email, or contact support.
              </Alert>
            )}

            {state === 'invalid' && (
              <Alert severity="error">
                <AlertTitle>Invalid link</AlertTitle>
                This verification link is not valid. Please check the link in your email
                or request a new one.
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
