'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Box        from '@mui/material/Box';
import Button     from '@mui/material/Button';
import Divider    from '@mui/material/Divider';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem   from '@mui/material/MenuItem';
import Switch     from '@mui/material/Switch';
import TextField  from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

import { FormDrawer, LoadingButton } from '@/components/shared';
import {
  useCreatePurposeMutation,
  useUpdatePurposeMutation,
  useCredentialOptions,
} from '@/hooks/api/useRelayPurposes';
import type {
  Purpose,
  ChannelToUse,
  CreatePurposePayload,
  UpdatePurposePayload,
  CredentialOption,
} from '@/types/communication-purposes';
import {
  buildCredentialSelectLabel,
  buildCredentialMetaLine,
} from '@/lib/credential-label';

// ─── CredentialSelect sub-component ──────────────────────────────────────────

interface CredentialSelectProps {
  name:          'emailCredentialId' | 'smsCredentialId';
  control:       any;
  label:         string;
  options:       CredentialOption[];
  loading:       boolean;
  emptyMessage:  string;
  helperText:    string;
}

/**
 * A select field that shows rich credential metadata.
 *
 * Trigger (selected value):   general — Gmail / SMTP
 * Dropdown item primary:      general
 * Dropdown item secondary:    Gmail · SMTP
 *
 * The submitted value is always the ProviderCredentials ObjectId (opt.id),
 * never the tag, provider name, or any other display field.
 */
function CredentialSelect({
  name,
  control,
  label,
  options,
  loading,
  emptyMessage,
  helperText,
}: CredentialSelectProps) {
  return (
    <Controller
      name={name}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          select
          label={label}
          fullWidth
          size="small"
          disabled={loading}
          helperText={loading ? 'Loading credentials…' : options.length === 0 ? emptyMessage : helperText}
          SelectProps={{
            /**
             * renderValue controls what appears in the select trigger after the user
             * picks an option. Without this, MUI renders the raw value (the ObjectId),
             * which is not useful. We look up the option and show the compact label.
             */
            renderValue: (value: unknown) => {
              if (!value) return <em style={{ color: 'inherit', fontStyle: 'normal', opacity: 0.5 }}>None</em>;
              const opt = options.find((o) => o.id === value);
              if (!opt) return String(value);
              return (
                <Typography variant="body2" noWrap>
                  {buildCredentialSelectLabel(opt)}
                </Typography>
              );
            },
            displayEmpty: true,
          }}
        >
          <MenuItem value="">
            <em>None</em>
          </MenuItem>
          {options.map((opt) => {
            const metaLine = buildCredentialMetaLine(opt);
            return (
              <MenuItem key={opt.id} value={opt.id}>
                <Box>
                  <Typography variant="body2" fontWeight={500} lineHeight={1.4}>
                    {opt.tag}
                  </Typography>
                  {metaLine && (
                    <Typography variant="caption" color="text.secondary" display="block" lineHeight={1.3}>
                      {metaLine}
                    </Typography>
                  )}
                </Box>
              </MenuItem>
            );
          })}
        </TextField>
      )}
    />
  );
}

// ─── Form shape ───────────────────────────────────────────────────────────────

interface FormValues {
  domainKey:              string;
  displayName:            string;
  domainCategory:         string;
  isActive:               boolean;
  emailCredentialId:      string;   // providerCredentialsId for email, '' = none
  smsCredentialId:        string;   // providerCredentialsId for sms, '' = none
}

const EMPTY_VALUES: FormValues = {
  domainKey:         '',
  displayName:       '',
  domainCategory:    '',
  isActive:          true,
  emailCredentialId: '',
  smsCredentialId:   '',
};

function purposeToFormValues(p: Purpose): FormValues {
  const email = p.channelsToUse.find((c) => c.channel === 'email');
  const sms   = p.channelsToUse.find((c) => c.channel === 'sms');
  return {
    domainKey:         p.domainKey,
    displayName:       p.displayName,
    domainCategory:    p.domainCategory,
    isActive:          p.isActive,
    emailCredentialId: email?.providerCredentialsId ?? '',
    smsCredentialId:   sms?.providerCredentialsId   ?? '',
  };
}

function buildChannelsToUse(values: FormValues): ChannelToUse[] {
  const channels: ChannelToUse[] = [];
  if (values.emailCredentialId) {
    channels.push({ channel: 'email', providerCredentialsId: values.emailCredentialId });
  }
  if (values.smsCredentialId) {
    channels.push({ channel: 'sms', providerCredentialsId: values.smsCredentialId });
  }
  return channels;
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface PurposeFormDrawerProps {
  open:      boolean;
  onClose:   () => void;
  purpose?:  Purpose | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function PurposeFormDrawer({
  open,
  onClose,
  purpose,
}: PurposeFormDrawerProps) {
  const isEdit = !!purpose;

  const createMutation = useCreatePurposeMutation();
  const updateMutation = useUpdatePurposeMutation();
  const saving = createMutation.isPending || updateMutation.isPending;

  // Load credential options eagerly when the drawer is open
  const { data: emailOptions = [], isLoading: loadingEmail } = useCredentialOptions('email', { enabled: open });
  const { data: smsOptions   = [], isLoading: loadingSms   } = useCredentialOptions('sms',   { enabled: open });

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ defaultValues: EMPTY_VALUES });

  useEffect(() => {
    if (open) {
      reset(purpose ? purposeToFormValues(purpose) : EMPTY_VALUES);
    }
  }, [open, purpose, reset]);

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function onSubmit(values: FormValues) {
    try {
      if (isEdit && purpose) {
        const payload: UpdatePurposePayload = {
          displayName:    values.displayName,
          domainCategory: values.domainCategory,
          isActive:       values.isActive,
          channelsToUse:  buildChannelsToUse(values),
        };
        await updateMutation.mutateAsync({ id: purpose.id, ...payload });
      } else {
        const payload: CreatePurposePayload = {
          domainKey:      values.domainKey.trim().toLowerCase(),
          displayName:    values.displayName,
          domainCategory: values.domainCategory,
          isActive:       values.isActive,
          channelsToUse:  buildChannelsToUse(values),
        };
        await createMutation.mutateAsync(payload);
      }
      onClose();
    } catch {
      // Error is surfaced via the mutation's onError snack notification.
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const credentialsLoading = loadingEmail || loadingSms;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEdit ? `Edit — ${purpose?.displayName}` : 'New Relay Purpose'}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={saving}>Cancel</Button>
          <LoadingButton
            variant="contained"
            loading={saving}
            onClick={handleSubmit(onSubmit)}
          >
            {isEdit ? 'Save Changes' : 'Create Purpose'}
          </LoadingButton>
        </>
      }
    >
      <Box display="flex" flexDirection="column" gap={2.5}>

        {/* ── SECTION A: Basic Information ───────────────────────────── */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>Basic Information</Typography>

          {/* Purpose Key — only editable on create */}
          <Box display="flex" flexDirection="column" gap={2} mt={1}>
            <Controller
              name="domainKey"
              control={control}
              rules={{
                required: 'Purpose Key is required',
                maxLength: { value: 100, message: 'Max 100 characters' },
                pattern: {
                  value: /^[a-z0-9_-]+$/,
                  message: 'Only lowercase letters, numbers, hyphens and underscores',
                },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Purpose Key"
                  required
                  fullWidth
                  size="small"
                  disabled={isEdit}
                  error={!!errors.domainKey}
                  helperText={
                    errors.domainKey?.message ??
                    (isEdit
                      ? 'Purpose Key cannot be changed after creation'
                      : 'Unique identifier — lowercase, no spaces (e.g. invoicing)')
                  }
                  inputProps={{ maxLength: 100 }}
                />
              )}
            />

            <Controller
              name="displayName"
              control={control}
              rules={{
                required: 'Purpose Name is required',
                maxLength: { value: 200, message: 'Max 200 characters' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Purpose Name"
                  required
                  fullWidth
                  size="small"
                  error={!!errors.displayName}
                  helperText={errors.displayName?.message ?? 'User-facing name shown in notifications'}
                />
              )}
            />

            <Controller
              name="domainCategory"
              control={control}
              rules={{
                required: 'Category is required',
                maxLength: { value: 100, message: 'Max 100 characters' },
              }}
              render={({ field }) => (
                <TextField
                  {...field}
                  label="Category"
                  required
                  fullWidth
                  size="small"
                  error={!!errors.domainCategory}
                  helperText={
                    errors.domainCategory?.message ??
                    'Grouping label (e.g. billing, support, marketing)'
                  }
                />
              )}
            />

            <Controller
              name="isActive"
              control={control}
              render={({ field: { value, onChange } }) => (
                <FormControlLabel
                  control={
                    <Switch
                      checked={value}
                      onChange={(e) => onChange(e.target.checked)}
                      size="small"
                    />
                  }
                  label={value ? 'Active' : 'Inactive'}
                />
              )}
            />
          </Box>
        </Box>

        <Divider />

        {/* ── SECTION B: Channel Credentials ────────────────────────── */}
        <Box>
          <Typography variant="subtitle2" gutterBottom>Channel Credentials</Typography>
          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
            Assign a credential for each channel this purpose uses.
            Only active credentials are shown.
          </Typography>

          <Box display="flex" flexDirection="column" gap={2}>

            {/* Email Credential */}
            <CredentialSelect
              name="emailCredentialId"
              control={control}
              label="Email Credential"
              options={emailOptions}
              loading={loadingEmail}
              emptyMessage="No active email credentials available in Relay"
              helperText="Optional — select a credential to send emails from this purpose"
            />

            {/* SMS Credential */}
            <CredentialSelect
              name="smsCredentialId"
              control={control}
              label="SMS Credential"
              options={smsOptions}
              loading={loadingSms}
              emptyMessage="No active SMS credentials available in Relay"
              helperText="Optional — select a credential to send SMS from this purpose"
            />

          </Box>
        </Box>

      </Box>
    </FormDrawer>
  );
}
