'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import { apiClient } from '@/lib/axios';
import { useAuthStore } from '@/stores/auth.store';
import { getLandingPage } from '@/config/rbac/role-config';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { FormError } from '@/components/shared/FormError';
import type { User } from '@/types/api';

const schema = z
  .object({
    currentPassword: z.string().min(1, 'Required.'),
    newPassword:     z.string().min(8, 'Password must be at least 8 characters.'),
    confirmPassword: z.string().min(1, 'Required.'),
  })
  .refine((d) => d.newPassword === d.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Passwords do not match.',
  });

type FormValues = z.infer<typeof schema>;

export default function ChangePasswordPage() {
  const router  = useRouter();
  const user    = useAuthStore((s) => s.user);
  const token   = useAuthStore((s) => s.accessToken);
  const mustChange = useAuthStore((s) => s.mustChangePassword);

  // Guard: unauthenticated → login; already changed → landing page.
  useEffect(() => {
    console.log('[ChangePasswordPage] guard', { token: !!token, user: !!user, mustChangePassword: mustChange });
    if (!token) {
      console.log('[ChangePasswordPage] no token → redirecting to /auth/login');
      router.replace('/auth/login');
      return;
    }
    if (user && !mustChange) {
      const target = getLandingPage(user.role);
      console.log('[ChangePasswordPage] mustChangePassword=false → redirecting to', target);
      router.replace(target);
    }
  }, [user, token, mustChange, router]);

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      console.log('[ChangePasswordPage] submitting PATCH /users/me/password');
      const { data: updatedUser } = await apiClient.patch<User>('/users/me/password', {
        currentPassword: values.currentPassword,
        newPassword:     values.newPassword,
      });
      console.log('[ChangePasswordPage] password changed', {
        mustChangePassword: updatedUser.mustChangePassword,
        role: updatedUser.role,
      });
      // Update auth store so the mustChangePassword gate lifts and the portal
      // layout won't redirect back here.
      useAuthStore.getState().setAuth(updatedUser, token!);
      const target = getLandingPage(updatedUser.role);
      console.log('[ChangePasswordPage] redirecting to', target);
      router.replace(target);
    } catch (e: unknown) {
      if (axios.isAxiosError(e)) {
        const status = e.response?.status;
        const msg = (e.response?.data as { message?: string })?.message;
        if (status === 401) {
          setError('currentPassword', { message: 'Incorrect password.' });
        } else {
          setError('root', { message: msg ?? 'Failed to change password. Please try again.' });
        }
      } else {
        setError('root', { message: 'An unexpected error occurred.' });
      }
    }
  }

  return (
    <Stack spacing={2}>
      <Box display="flex" flexDirection="column" alignItems="center" gap={1}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: '50%',
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'white',
          }}
        >
          <LockOutlinedIcon />
        </Box>
        <Typography variant="h5" fontWeight={600}>
          Change your password
        </Typography>
        <Typography variant="body2" color="text.secondary" textAlign="center" maxWidth={340}>
          Your account was created with a temporary password. You must set a new password
          before continuing.
        </Typography>
      </Box>

      <Card variant="outlined" sx={{ borderRadius: 3 }}>
        <CardContent>
          <Stack spacing={2}>
            {errors.root?.message && (
              <Alert severity="error">{errors.root.message}</Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2}>
                <Controller
                  name="currentPassword"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Temporary password"
                      type="password"
                      fullWidth
                      required
                      autoFocus
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      autoComplete="current-password"
                    />
                  )}
                />

                <Controller
                  name="newPassword"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="New password"
                      type="password"
                      fullWidth
                      required
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      autoComplete="new-password"
                    />
                  )}
                />

                <Controller
                  name="confirmPassword"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Confirm new password"
                      type="password"
                      fullWidth
                      required
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      autoComplete="new-password"
                    />
                  )}
                />

                <LoadingButton
                  type="submit"
                  variant="contained"
                  fullWidth
                  loading={isSubmitting}
                >
                  Set new password
                </LoadingButton>
              </Stack>
            </form>
          </Stack>
        </CardContent>
      </Card>

      {user?.email && (
        <Typography variant="caption" color="text.secondary" textAlign="center">
          Signed in as {user.email}
        </Typography>
      )}
    </Stack>
  );
}
