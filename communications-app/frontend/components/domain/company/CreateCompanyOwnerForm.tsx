'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  FormDrawer,
  ControlledTextField,
  ControlledSelect,
  FormError,
} from '@/components/shared';
import {
  createCompanyWithOwnerSchema,
  type CreateCompanyWithOwnerFormData,
  COMMON_TIMEZONES,
} from '@/lib/schemas/company.schema';

interface CreateCompanyOwnerFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompanyWithOwnerFormData) => Promise<void>;
  loading: boolean;
  error?: string;
}

export function CreateCompanyOwnerForm({
  open,
  onClose,
  onSubmit,
  loading,
  error,
}: CreateCompanyOwnerFormProps) {
  const form = useForm<CreateCompanyWithOwnerFormData>({
    resolver: zodResolver(createCompanyWithOwnerSchema),
    defaultValues: {
      displayName:    '',
      timezone:       'Australia/Sydney',
      ownerFirstName: '',
      ownerLastName:  '',
      ownerEmail:     '',
    },
  });

  const handleClose = () => {
    form.reset();
    onClose();
  };

  const handleSubmit = form.handleSubmit(async (data) => {
    await onSubmit(data);
    form.reset();
  });

  return (
    <FormDrawer
      open={open}
      onClose={handleClose}
      title="Create Company"
      actions={
        <>
          <Button variant="outlined" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={loading}>
            {loading ? 'Creating…' : 'Create Company'}
          </Button>
        </>
      }
    >
      <Stack spacing={3}>
        <FormError message={error} />

        {/* Company section */}
        <Typography variant="subtitle2" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em" fontSize={11}>
          Company
        </Typography>

        <ControlledTextField
          name="displayName"
          control={form.control}
          label="Company Name"
          required
          autoFocus
        />

        <ControlledSelect
          name="timezone"
          control={form.control}
          label="Timezone"
          options={COMMON_TIMEZONES}
          required
        />

        <Divider />

        {/* Owner section */}
        <Typography variant="subtitle2" color="text.secondary" textTransform="uppercase" letterSpacing="0.05em" fontSize={11}>
          Initial Owner
        </Typography>

        <ControlledTextField
          name="ownerFirstName"
          control={form.control}
          label="First Name"
          required
        />

        <ControlledTextField
          name="ownerLastName"
          control={form.control}
          label="Last Name"
          required
        />

        <ControlledTextField
          name="ownerEmail"
          control={form.control}
          label="Email"
          type="email"
          required
        />

        <Typography variant="caption" color="text.secondary">
          A temporary password will be generated automatically and sent to the owner&apos;s email.
          They will be required to change it on first login.
        </Typography>
      </Stack>
    </FormDrawer>
  );
}
