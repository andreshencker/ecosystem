'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import {
  FormDrawer,
  ControlledTextField,
  ControlledSelect,
  ControlledSwitch,
  FormError,
} from '@/components/shared';
import {
  updateUserSchema,
  ROLE_OPTIONS,
  type UpdateUserFormData,
} from '@/lib/schemas/user.schema';
import type { User } from '@/types/api';

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserEditFormProps {
  open: boolean;
  user: User | null;
  /** Context-filtered role options. Defaults to all roles if omitted. */
  roleOptions?: { value: string; label: string }[];
  onClose: () => void;
  onSubmit: (data: UpdateUserFormData) => Promise<void>;
  loading: boolean;
  error?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserEditForm({
  open,
  user,
  roleOptions,
  onClose,
  onSubmit,
  loading,
  error,
}: UserEditFormProps) {
  const resolvedRoleOptions = roleOptions ?? (ROLE_OPTIONS as unknown as { value: string; label: string }[]);
  const form = useForm<UpdateUserFormData>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      role: undefined,
      isActive: true,
    },
  });

  // Pre-fill form when user changes or drawer opens
  useEffect(() => {
    if (user && open) {
      form.reset({
        firstName: user.firstName ?? '',
        lastName: user.lastName ?? '',
        role: user.role,
        isActive: user.isActive !== false,
      });
    }
  }, [user, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
  });

  return (
    <FormDrawer
      open={open}
      onClose={handleClose}
      title={user ? `Edit ${[user.firstName, user.lastName].filter(Boolean).join(' ') || user.email}` : 'Edit User'}
      actions={
        <>
          <Button variant="outlined" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <Stack spacing={3}>
        <FormError message={error} />

        <ControlledTextField
          name="firstName"
          control={form.control}
          label="First Name"
        />
        <ControlledTextField
          name="lastName"
          control={form.control}
          label="Last Name"
        />
        <ControlledSelect
          name="role"
          control={form.control}
          label="Role"
          options={resolvedRoleOptions}
        />
        <ControlledSwitch
          name="isActive"
          control={form.control}
          label="Active"
        />
      </Stack>
    </FormDrawer>
  );
}
