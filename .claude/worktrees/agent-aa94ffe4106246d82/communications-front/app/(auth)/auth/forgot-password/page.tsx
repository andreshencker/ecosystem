'use client';

import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Link from '@mui/material/Link';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import NextLink from 'next/link';
import { apiClient } from '@/lib/axios';
import { LoadingButton } from '@/components/shared/LoadingButton';

const schema = z.object({
  email: z.string().email('Please enter a valid email address.'),
});

type FormValues = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [submitted, setSubmitted] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  });

  async function onSubmit(values: FormValues) {
    try {
      await apiClient.post('/auth/forgot-password', { email: values.email });
    } catch {
      // Always show success to prevent email enumeration (backend mirrors this behavior).
    } finally {
      setSubmitted(true);
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
              Reset password
            </Typography>

            {submitted ? (
              <Alert severity="success">
                If an account exists for that email, a password reset link has been sent.
                Please check your inbox and spam folder.
              </Alert>
            ) : (
              <form onSubmit={handleSubmit(onSubmit)} noValidate>
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Enter your email address and we&apos;ll send you a link to reset your password.
                  </Typography>

                  <Controller
                    name="email"
                    control={control}
                    render={({ field }) => (
                      <TextField
                        {...field}
                        label="Email"
                        type="email"
                        fullWidth
                        required
                        error={!!errors.email}
                        helperText={errors.email?.message}
                        autoComplete="email"
                        autoFocus
                      />
                    )}
                  />

                  <LoadingButton
                    type="submit"
                    variant="contained"
                    fullWidth
                    loading={isSubmitting}
                  >
                    Send reset link
                  </LoadingButton>
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
