'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { apiClient } from '@/lib/axios';
import { mapApiError } from '@/lib/mapApiError';
import { mapValidationErrors, extractValidationErrors } from '@/lib/mapValidationErrors';
import { registerSchema, type RegisterFormValues } from '@/lib/schemas/auth.schema';
import { FormError } from '@/components/shared/FormError';
import { LoadingButton } from '@/components/shared/LoadingButton';
import { ControlledPasswordField } from '@/components/shared/ControlledPasswordField';

export default function RegisterPage() {
  const router = useRouter();
  const [formError, setFormError] = useState<string | undefined>();

  const {
    control,
    handleSubmit,
    setError,
    formState: { isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onBlur',
    defaultValues: {
      companyName:     '',
      firstName:       '',
      lastName:        '',
      email:           '',
      password:        '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setFormError(undefined);
    try {
      await apiClient.post('/auth/register', {
        companyName: values.companyName,
        firstName:   values.firstName,
        lastName:    values.lastName,
        email:       values.email,
        password:    values.password,
      });
      router.push('/auth/login?registered=true');
    } catch (e: unknown) {
      const validationErrors = extractValidationErrors(e);
      if (validationErrors) {
        const mapped = mapValidationErrors(validationErrors);
        let hasFieldErrors = false;
        for (const [field, message] of Object.entries(mapped)) {
          if (field === '_form') {
            setFormError(message);
          } else {
            setError(field as keyof RegisterFormValues, { message });
            hasFieldErrors = true;
          }
        }
        if (!hasFieldErrors && !mapped['_form']) {
          setFormError(mapApiError(e));
        }
        return;
      }
      setFormError(mapApiError(e));
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
              Create account
            </Typography>

            <form onSubmit={handleSubmit(onSubmit)} noValidate>
              <Stack spacing={2}>
                <Controller
                  name="companyName"
                  control={control}
                  render={({ field, fieldState }) => (
                    <TextField
                      {...field}
                      label="Company Name"
                      fullWidth
                      required
                      error={!!fieldState.error}
                      helperText={fieldState.error?.message}
                      autoComplete="organization"
                      disabled={isSubmitting}
                    />
                  )}
                />

                <Stack direction="row" spacing={2}>
                  <Controller
                    name="firstName"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="First name"
                        fullWidth
                        required
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        autoComplete="given-name"
                        disabled={isSubmitting}
                      />
                    )}
                  />
                  <Controller
                    name="lastName"
                    control={control}
                    render={({ field, fieldState }) => (
                      <TextField
                        {...field}
                        label="Last name"
                        fullWidth
                        required
                        error={!!fieldState.error}
                        helperText={fieldState.error?.message}
                        autoComplete="family-name"
                        disabled={isSubmitting}
                      />
                    )}
                  />
                </Stack>

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
                      disabled={isSubmitting}
                    />
                  )}
                />

                <ControlledPasswordField
                  name="password"
                  control={control}
                  label="Password"
                  fullWidth
                  required
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />

                <ControlledPasswordField
                  name="confirmPassword"
                  control={control}
                  label="Confirm password"
                  fullWidth
                  required
                  autoComplete="new-password"
                  disabled={isSubmitting}
                />

                <FormError message={formError} />

                <LoadingButton
                  type="submit"
                  variant="contained"
                  fullWidth
                  loading={isSubmitting}
                >
                  Create account
                </LoadingButton>
              </Stack>
            </form>

            <Box textAlign="center">
              <Link component={NextLink} href="/auth/login" variant="body2">
                Already have an account? Sign in
              </Link>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    </Stack>
  );
}
