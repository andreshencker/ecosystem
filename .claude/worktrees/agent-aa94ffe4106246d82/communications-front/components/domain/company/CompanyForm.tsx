'use client';

import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import {
  FormDrawer,
  ControlledTextField,
  ControlledSelect,
  ControlledSwitch,
  FormError,
  PermissionGuard,
} from '@/components/shared';
import {
  createCompanySchema,
  updateCompanySchema,
  COMMON_TIMEZONES,
  type CreateCompanyFormData,
  type UpdateCompanyFormData,
} from '@/lib/schemas/company.schema';
import { usePermissions } from '@/hooks/usePermissions';
import type { Company } from '@/types/api';

// ─── Create mode ─────────────────────────────────────────────────────────────

interface CreateCompanyFormProps {
  mode: 'create';
  open: boolean;
  onClose: () => void;
  onSubmit: (data: CreateCompanyFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
}

// ─── Edit mode ────────────────────────────────────────────────────────────────

interface EditCompanyFormProps {
  mode: 'edit';
  open: boolean;
  onClose: () => void;
  company: Company;
  onSubmit: (data: UpdateCompanyFormData) => Promise<void>;
  loading?: boolean;
  error?: string;
}

type CompanyFormProps = CreateCompanyFormProps | EditCompanyFormProps;

export function CompanyForm(props: CompanyFormProps) {
  const { mode, open, onClose, onSubmit, loading = false, error } = props;
  const { canDeactivateCompany } = usePermissions();

  // ── Create form ────────────────────────────────────────────────────────────
  const createForm = useForm<CreateCompanyFormData>({
    resolver: zodResolver(createCompanySchema),
    defaultValues: { companyKey: '', displayName: '', legalName: '', tagline: '', timezone: 'UTC' },
  });

  // ── Edit form ──────────────────────────────────────────────────────────────
  const editForm = useForm<UpdateCompanyFormData>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: { displayName: '', legalName: '', tagline: '', timezone: 'UTC', isActive: true },
  });

  // Pre-fill edit form when company changes
  useEffect(() => {
    if (mode === 'edit') {
      const c = (props as EditCompanyFormProps).company;
      editForm.reset({
        displayName: c.displayName,
        legalName: c.legalName ?? '',
        tagline: c.tagline ?? '',
        timezone: c.timezone,
        isActive: c.isActive,
      });
    }
  }, [mode, open]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleClose = () => {
    createForm.reset();
    editForm.reset();
    onClose();
  };

  // ─── Create submission ─────────────────────────────────────────────────────
  if (mode === 'create') {
    const handleSubmit = createForm.handleSubmit(async (data) => {
      await (onSubmit as (d: CreateCompanyFormData) => Promise<void>)(data);
    });

    return (
      <FormDrawer
        open={open}
        onClose={handleClose}
        title="New Company"
        actions={
          <>
            <Button variant="outlined" onClick={handleClose} disabled={loading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleSubmit}
              disabled={loading}
            >
              {loading ? 'Creating…' : 'Create'}
            </Button>
          </>
        }
      >
        <Stack spacing={3}>
          <FormError message={error} />

          <ControlledTextField
            name="companyKey"
            control={createForm.control}
            label="Company Key"
            required
            helperText="Unique slug, e.g. acme-corp. Cannot be changed after creation."
          />
          <ControlledTextField
            name="displayName"
            control={createForm.control}
            label="Display Name"
            required
          />
          <ControlledTextField
            name="legalName"
            control={createForm.control}
            label="Legal Name"
          />
          <ControlledTextField
            name="tagline"
            control={createForm.control}
            label="Tagline"
          />
          <ControlledSelect
            name="timezone"
            control={createForm.control}
            label="Timezone"
            options={COMMON_TIMEZONES}
            required
          />
        </Stack>
      </FormDrawer>
    );
  }

  // ─── Edit submission ───────────────────────────────────────────────────────
  const company = (props as EditCompanyFormProps).company;

  const handleEditSubmit = editForm.handleSubmit(async (data) => {
    await (onSubmit as (d: UpdateCompanyFormData) => Promise<void>)(data);
  });

  return (
    <FormDrawer
      open={open}
      onClose={handleClose}
      title={`Edit ${company.displayName}`}
      actions={
        <>
          <Button variant="outlined" onClick={handleClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleEditSubmit}
            disabled={loading}
          >
            {loading ? 'Saving…' : 'Save'}
          </Button>
        </>
      }
    >
      <Stack spacing={3}>
        <FormError message={error} />

        {/* companyKey — always read-only in edit mode */}
        <Stack spacing={0.5}>
          <Typography variant="caption" color="text.secondary">
            Company Key (read-only)
          </Typography>
          <Typography variant="body2" color="text.primary" fontFamily="monospace">
            {company.companyKey}
          </Typography>
        </Stack>

        <ControlledTextField
          name="displayName"
          control={editForm.control}
          label="Display Name"
          required
        />
        <ControlledTextField
          name="legalName"
          control={editForm.control}
          label="Legal Name"
        />
        <ControlledTextField
          name="tagline"
          control={editForm.control}
          label="Tagline"
        />
        <ControlledSelect
          name="timezone"
          control={editForm.control}
          label="Timezone"
          options={COMMON_TIMEZONES}
          required
        />

        <PermissionGuard allowed={canDeactivateCompany}>
          <ControlledSwitch
            name="isActive"
            control={editForm.control}
            label="Active"
          />
        </PermissionGuard>
      </Stack>
    </FormDrawer>
  );
}
