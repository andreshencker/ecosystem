'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
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

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [errorMessage, setErrorMessage] = useState<string | null>(
    token ? null : 'Invalid reset link.',
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    setErrorMessage(null);
    setLoading(true);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword: values.password,
      });
      setSuccessMessage('Password reset successfully. Redirecting to login…');
      setTimeout(() => router.push('/auth/login'), 2000);
    } catch (e: unknown) {
      if (axios.isAxiosError(e) && e.response?.data?.message) {
        setErrorMessage(e.response.data.message as string);
      } else {
        setErrorMessage('This link has expired or has already been used.');
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
              Set new password
            </Typography>

            {successMessage && (
              <Alert severity="success">{successMessage}</Alert>
            )}

            {errorMessage && !successMessage && (
              <Alert severity="error">{errorMessage}</Alert>
            )}

            {!successMessage && token && (
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Stack spacing={2}>
                  <Controller
                    name="password"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="New password"
                        type="password"
                        fullWidth
                        error={!!errors.password}
                        helperText={errors.password?.message}
                        autoComplete="new-password"
                      />
                    )}
                  />

                  <Controller
                    name="confirmPassword"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Confirm new password"
                        type="password"
                        fullWidth
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword?.message}
                        autoComplete="new-password"
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
                    {loading ? 'Resetting…' : 'Reset password'}
                  </Button>
                </Stack>
              </form>
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

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetPasswordForm />
    </Suspense>
  );
}
