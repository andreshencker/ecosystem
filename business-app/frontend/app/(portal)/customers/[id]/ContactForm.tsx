'use client';

import React from 'react';
import { useForm, Controller } from 'react-hook-form';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import { LoadingButton } from '@/components/shared';
import type { CreateContactPayload } from '@/types/customer';

interface ContactFormProps {
  onSubmit:  (dto: CreateContactPayload) => Promise<void>;
  onCancel:  () => void;
  loading:   boolean;
  defaults?: Partial<CreateContactPayload>;
}

export function ContactForm({ onSubmit, onCancel, loading, defaults }: ContactFormProps) {
  const { control, handleSubmit, formState: { errors } } = useForm<CreateContactPayload>({
    defaultValues: {
      firstName: defaults?.firstName ?? '',
      lastName:  defaults?.lastName  ?? '',
      email:     defaults?.email     ?? '',
      phone:     defaults?.phone     ?? '',
      role:      defaults?.role      ?? '',
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <Box display="flex" flexDirection="column" gap={2.5} p={3}>
        <Controller
          name="firstName"
          control={control}
          rules={{ required: 'First name is required', maxLength: { value: 100, message: 'Max 100 chars' } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="First name"
              required
              fullWidth
              error={!!errors.firstName}
              helperText={errors.firstName?.message}
            />
          )}
        />
        <Controller
          name="lastName"
          control={control}
          rules={{ required: 'Last name is required', maxLength: { value: 100, message: 'Max 100 chars' } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Last name"
              required
              fullWidth
              error={!!errors.lastName}
              helperText={errors.lastName?.message}
            />
          )}
        />
        <Controller
          name="role"
          control={control}
          rules={{ maxLength: { value: 100, message: 'Max 100 chars' } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Role"
              fullWidth
              placeholder="e.g. Accounts Payable"
              error={!!errors.role}
              helperText={errors.role?.message}
            />
          )}
        />
        <Controller
          name="email"
          control={control}
          rules={{ pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Invalid email' } }}
          render={({ field }) => (
            <TextField
              {...field}
              type="email"
              label="Email"
              fullWidth
              error={!!errors.email}
              helperText={errors.email?.message}
            />
          )}
        />
        <Controller
          name="phone"
          control={control}
          rules={{ maxLength: { value: 30, message: 'Max 30 chars' } }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Phone"
              fullWidth
              error={!!errors.phone}
              helperText={errors.phone?.message}
            />
          )}
        />

        <Box display="flex" gap={2} justifyContent="flex-end" pt={1}>
          <Button variant="outlined" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <LoadingButton type="submit" variant="contained" loading={loading}>
            Add Contact
          </LoadingButton>
        </Box>
      </Box>
    </form>
  );
}
