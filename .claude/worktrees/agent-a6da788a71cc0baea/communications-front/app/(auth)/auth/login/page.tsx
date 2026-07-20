'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import { Suspense } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { apiClient } from '@/lib/axios';
import { REFRESH_TOKEN_KEY } from '@/lib/constants';
import { useAuthStore } from '@/stores/auth.store';
import type { AuthResponse } from '@/types/api';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

type FormValues = z.infer<typeof schema>;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === 'true';

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  });

  async function onSubmit(values: FormValues) {
    setErrorMessage(null);
    setLoading(true);
    try {
      const { data } = await apiClient.post<AuthResponse>('/auth/login', {
        email: values.email,
        password: values.password,
      });
      useAuthStore.getState().setAuth(data.user, data.accessToken);
      localStorage.setItem(REFRESH_TOKEN_KEY, data.refreshToken);
      router.push('/dashboard');
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.status === 401) {
        setErrorMessage('Invalid email or password');
      } else if (axios.isAxiosError(e) && e.response?.data?.message) {
        setErrorMessage(e.response.data.message as string);
      } else {
        setErrorMessage('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
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
              Sign in
            </Typography>

            {registered && (
              <Alert severity="success">Account created. Please log in.</Alert>
            )}

            {errorMessage && (
              <Alert severity="error">{errorMessage}</Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      error={!!errors.email}
                      helperText={errors.email?.message}
                      autoComplete="email"
                    />
                  )}
                />

                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Password"
                      type="password"
                      fullWidth
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      autoComplete="current-password"
                    />
                  )}
                />

                <Button
                  type="submit"
                  variant="contained"
                  fullWidth
                  disabled={loading}
                  startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
                >
                  {loading ? 'Signing in…' : 'Sign in'}
                </Button>
              </Stack>
            </form>

            <Stack direction="row" justifyContent="space-between">
              <Link component={NextLink} href="/auth/register" variant="body2">
                Don&apos;t have an account? Register
              </Link>
              <Link component={NextLink} href="/auth/forgot-password" variant="body2">
                Forgot password?
              </Link>
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
