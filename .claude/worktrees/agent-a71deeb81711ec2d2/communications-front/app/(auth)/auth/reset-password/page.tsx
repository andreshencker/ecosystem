'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
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
import { LoadingButton } from '@/components/shared/LoadingButton';
import { FormError } from '@/components/shared/FormError';
import { ControlledPasswordField } from '@/components/shared/ControlledPasswordField';

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Please confirm your password.'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

type FormValues = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formError, setFormError] = useState<string | undefined>(
    token ? undefined : 'Invalid or missing reset link.',
  );
  const [success, setSuccess] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  async function onSubmit(values: FormValues) {
    if (!token) return;
    setFormError(undefined);
    try {
      await apiClient.post('/auth/reset-password', {
        token,
        newPassword: values.password,
      });
      setSuccess(true);
      setTimeout(() => router.push('/auth/login'), 2500);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const msg = (e.response?.data as { message?: string })?.message;
        setFormError(
          typeof msg === 'string' && msg
            ? msg
            : 'This link has expired or has already been used.',
        );
      } else {
        setFormError('An unexpected error occurred. Please try again.');
      }
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

            {success && (
              <Alert severity="success">
                <AlertTitle>Password reset</AlertTitle>
                Your password has been reset successfully. Redirecting to sign in…
              </Alert>
            )}

            {!success && formError && !token && (
              <Alert severity="error">
                <AlertTitle>Invalid link</AlertTitle>
                {formError} Please use the link from your reset email or request a new one.
              </Alert>
            )}

            {!success && formError && token && (
              <Alert severity="error">{formError}</Alert>
            )}

            {!success && token && (
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Stack spacing={2}>
                  <ControlledPasswordField
                    name="password"
                    control={control}
                    label="New password"
                    fullWidth
                    required
                    autoFocus
                    autoComplete="new-password"
                  />

                  <ControlledPasswordField
                    name="confirmPassword"
                    control={control}
                    label="Confirm new password"
                    fullWidth
                    required
                    autoComplete="new-password"
                  />

                  <FormError message={formError && token ? formError : undefined} />

                  <LoadingButton
                    type="submit"
                    variant="contained"
                    fullWidth
                    loading={isSubmitting}
                  >
                    Reset password
                  </LoadingButton>
                </Stack>
              </form>
            )}

            {(!token || success) && (
              <Box textAlign="center">
                <Link component={NextLink} href="/auth/login" variant="body2">
                  Back to sign in
                </Link>
              </Box>
            )}

            {token && !success && (
              <Box textAlign="center">
                <Link component={NextLink} href="/auth/forgot-password" variant="body2">
                  Request a new link
                </Link>
              </Box>
            )}
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
