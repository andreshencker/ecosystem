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
  FormError,
} from '@/components/shared';
import {
  inviteUserSchema,
  type InviteUserFormData,
} from '@/lib/schemas/user.schema';

interface RoleOption {
  value: string;
  label: string;
}

interface InviteUserDialogProps {
  open: boolean;
  roleOptions: RoleOption[];
  onClose: () => void;
  onSubmit: (data: InviteUserFormData) => Promise<void>;
  loading: boolean;
  error?: string;
}

const EMPTY_INVITE_VALUES = {
  email:            '',
  firstName:        '',
  lastName:         '',
  role:             '' as InviteUserFormData['role'],
  targetCompanyId:  '',
  targetCompanyKey: '',
};

export function InviteUserDialog({
  open,
  roleOptions,
  onClose,
  onSubmit,
  loading,
  error,
}: InviteUserDialogProps) {
  const form = useForm<InviteUserFormData>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: EMPTY_INVITE_VALUES,
  });

  useEffect(() => {
    if (open) form.reset(EMPTY_INVITE_VALUES);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleClose = () => {
    form.reset(EMPTY_INVITE_VALUES);
    onClose();
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    console.log('[InviteUserDialog] invite submit clicked');
    console.log('[InviteUserDialog] invite payload', data);
    try {
      await onSubmit(data);
      console.log('[InviteUserDialog] invite mutation success');
    } catch (err) {
      console.error('[InviteUserDialog] invite mutation error', err);
      throw err;
    }
  });

  return (
    <FormDrawer
      open={open}
      onClose={handleClose}
      title="Invite User"
      actions={
        <>
          <Button variant="outlined" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Sending…' : 'Send Invite'}
          </Button>
        </>
      }
    >
      <Stack spacing={3}>
        <FormError message={error} />

        <ControlledTextField
          name="email"
          control={form.control}
          label="Email"
          required
        />
        <ControlledTextField
          name="firstName"
          control={form.control}
          label="First Name"
          required
        />
        <ControlledTextField
          name="lastName"
          control={form.control}
          label="Last Name"
          required
        />

        <ControlledSelect
          name="role"
          control={form.control}
          label="Role"
          options={roleOptions}
          required
        />
      </Stack>
    </FormDrawer>
  );
}
