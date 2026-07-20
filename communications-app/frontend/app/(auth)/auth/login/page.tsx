'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { mapApiError } from '@/lib/mapApiError';
import { loginSchema, type LoginFormValues } from '@/lib/schemas/auth.schema';
import { FormError } from '@/components/shared/FormError';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { ControlledPasswordField } from '@/components/shared/ControlledPasswordField';

// ─── Error states emitted by the backend login endpoint ──────────────────────

type LoginErrorState = 'idle' | 'email_not_verified' | 'account_inactive';

function extractLoginErrorState(error: unknown): LoginErrorState {
  if (!axios.isAxiosError(error) || error.response?.status !== 403) return 'idle';
  const code = (error.response.data as { error?: string } | undefined)?.error;
  if (code === 'EMAIL_NOT_VERIFIED') return 'email_not_verified';
  if (code === 'ACCOUNT_INACTIVE') return 'account_inactive';
  return 'idle';
}

// ─── Form ─────────────────────────────────────────────────────────────────────

function LoginForm() {
  const searchParams = useSearchParams();
  const registered = searchParams.get('registered') === 'true';
  const verified   = searchParams.get('verified')   === 'true';
  const { login } = useAuth();

  const [formError, setFormError] = useState<string | undefined>();
  const [errorState, setErrorState] = useState<LoginErrorState>('idle');

  const {
    control,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onBlur',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(undefined);
    setErrorState('idle');
    try {
      await login(values.email, values.password);
      // login() redirects on success — nothing to do here
    } catch (e: unknown) {
      const state = extractLoginErrorState(e);
      if (state !== 'idle') {
        setErrorState(state);
      } else {
        setFormError(mapApiError(e, 'login'));
      }
    }
  };

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

            {verified && (
              <Alert severity="success">
                Email verified successfully. You can now sign in.
              </Alert>
            )}

            {registered && (
              <Alert severity="success">
                Your account has been created successfully. Please verify your email before signing in.
              </Alert>
            )}

            {errorState === 'email_not_verified' && (
              <Alert severity="warning">
                <AlertTitle>Email not verified</AlertTitle>
                Please verify your email address before signing in. Check your inbox (and spam folder)
                for a verification link.
              </Alert>
            )}

            {errorState === 'account_inactive' && (
              <Alert severity="error">
                <AlertTitle>Account deactivated</AlertTitle>
                This account has been deactivated. Please contact your administrator.
              </Alert>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2}>
                <Controller
                  name="email"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Email"
                      type="email"
                      fullWidth
                      required
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      autoComplete="email"
                      inputProps={{ 'data-testid': 'email-input' }}
                    />
                  )}
                />

                <ControlledPasswordField
                  name="password"
                  control={control}
                  label="Password"
                  fullWidth
                  required
                  autoComplete="current-password"
                  inputProps={{ 'data-testid': 'password-input' }}
                />

                <FormError message={formError} />

                <LoadingButton
                  type="submit"
                  variant="contained"
                  fullWidth
                  loading={isSubmitting}
                  data-testid="login-submit"
                >
                  Sign in
                </LoadingButton>
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
