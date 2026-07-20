'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import {
  FormDrawer,
  FormError,
  LoadingButton,
  ControlledSwitch,
} from '@/components/shared';
import { useCrudFeedback } from '@/hooks/useCrudFeedback';
import {
  useCreateChannelProviderMutation,
  useUpdateChannelProviderMutation,
  useChannels,
  useProviders,
} from '@/hooks/api/useCompanyChannelProviders';
import { mapApiError } from '@/lib/mapApiError';
import { mapValidationErrors, extractValidationErrors } from '@/lib/mapValidationErrors';
import {
  channelProviderFormSchema,
  type ChannelProviderFormValues,
} from '@/lib/schemas/channel-provider.schema';
import type { CompanyChannelProvider } from '@/types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  api_key:      'API Key',
  smtp:         'SMTP',
  oauth:        'OAuth',
  access_keys:  'Access Keys',
  app_password: 'App Password',
};

const FORM_ID = 'channel-provider-form';

function getChannelName(item: CompanyChannelProvider): string {
  return item.channel?.displayName ?? String(item.channelId);
}

function getProviderLabel(item: CompanyChannelProvider): string {
  const name = item.provider?.displayName ?? String(item.providerId);
  const ct   = item.provider?.connectionType;
  return ct ? `${name} — ${CONNECTION_TYPE_LABELS[ct] ?? ct}` : name;
}

// ─── ChannelProviderForm ──────────────────────────────────────────────────────

interface ChannelProviderFormProps {
  open: boolean;
  mode: 'create' | 'edit';
  existing?: CompanyChannelProvider;
  companyId: string;
  onClose: () => void;
}

export function ChannelProviderForm({
  open,
  mode,
  existing,
  companyId,
  onClose,
}: ChannelProviderFormProps) {
  const isEditing = mode === 'edit';

  const createMutation = useCreateChannelProviderMutation();
  const updateMutation = useUpdateChannelProviderMutation();

  const [formError, setFormError] = useState<string | undefined>();

  const {
    control,
    handleSubmit,
    watch,
    reset,
    setValue,
    setError,
    formState: { isSubmitting },
  } = useForm<ChannelProviderFormValues>({
    resolver: zodResolver(channelProviderFormSchema),
    mode: 'onBlur',
    defaultValues: {
      channelId:  existing?.channel?.id ?? String(existing?.channelId ?? ''),
      providerId: existing?.provider?.id ?? String(existing?.providerId ?? ''),
      isDefault:  existing?.isDefault  ?? false,
      isActive:   existing?.isActive   ?? true,
    },
  });

  // Reset form each time the drawer opens
  useEffect(() => {
    if (open) {
      reset({
        channelId:  existing?.channel?.id ?? String(existing?.channelId ?? ''),
        providerId: existing?.provider?.id ?? String(existing?.providerId ?? ''),
        isDefault:  existing?.isDefault  ?? false,
        isActive:   existing?.isActive   ?? true,
      });
      setFormError(undefined);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Catalog queries (only needed in create mode)
  const { data: channels = [], isLoading: channelsLoading } = useChannels();
  const selectedChannelId = watch('channelId');
  const { data: providers = [], isLoading: providersLoading } = useProviders(
    isEditing ? undefined : selectedChannelId || undefined,
  );

  // Derived: connection type from selected provider in create mode
  const selectedProviderId = watch('providerId');
  const connectionType = isEditing
    ? (existing?.provider?.connectionType ?? '')
    : (providers.find((p) => p.id === selectedProviderId)?.connectionType ?? '');

  const feedback = useCrudFeedback({
    successMessage: isEditing ? 'Provider configuration updated' : 'Provider enabled',
    queryKeys: [['company-channel-providers', companyId]],
    onSuccess: onClose,
  });

  const onSubmit = async (values: ChannelProviderFormValues) => {
    setFormError(undefined);
    try {
      if (isEditing && existing) {
        await updateMutation.mutateAsync({
          id:        existing.id,
          isDefault: values.isDefault,
          isActive:  values.isActive,
        });
      } else {
        await createMutation.mutateAsync({
          companyId,
          channelId:  values.channelId,
          providerId: values.providerId,
          isDefault:  values.isDefault,
          isActive:   values.isActive,
        });
      }
      feedback.onSuccess();
    } catch (e: unknown) {
      const validationErrors = extractValidationErrors(e);
      if (validationErrors) {
        const mapped = mapValidationErrors(validationErrors);
        for (const [field, message] of Object.entries(mapped)) {
          if (field === '_form') setFormError(message);
          else setError(field as keyof ChannelProviderFormValues, { message });
        }
        return;
      }
      setFormError(mapApiError(e));
    }
  };

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Provider Configuration' : 'Enable Provider'}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <LoadingButton
            type="submit"
            form={FORM_ID}
            variant="contained"
            loading={isSubmitting}
          >
            {isEditing ? 'Save Changes' : 'Enable Provider'}
          </LoadingButton>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={2.5}>
          {/* ── Channel ─────────────────────────────────────────────────────── */}
          {isEditing ? (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Channel
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {getChannelName(existing!)}
              </Typography>
            </Box>
          ) : (
            <Controller
              name="channelId"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  select
                  label="Channel"
                  fullWidth
                  required
                  disabled={channelsLoading || isSubmitting}
                  error={!!fieldState.error}
                  helperText={
                    fieldState.error?.message ??
                    'Select the communication channel for this provider.'
                  }
                  onChange={(e) => {
                    field.onChange(e);
                    setValue('providerId', '');
                  }}
                >
                  {channelsLoading ? (
                    <MenuItem value="">
                      <em>Loading…</em>
                    </MenuItem>
                  ) : channels.length === 0 ? (
                    <MenuItem value="" disabled>
                      No channels available
                    </MenuItem>
                  ) : (
                    channels.map((ch) => (
                      <MenuItem key={ch.id} value={ch.id}>
                        {ch.displayName}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              )}
            />
          )}

          {/* ── Provider ────────────────────────────────────────────────────── */}
          {isEditing ? (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Provider
              </Typography>
              <Typography variant="body2" fontWeight={500}>
                {getProviderLabel(existing!)}
              </Typography>
            </Box>
          ) : (
            <Controller
              name="providerId"
              control={control}
              render={({ field, fieldState }) => (
                <TextField
                  {...field}
                  select
                  label="Provider"
                  fullWidth
                  required
                  disabled={!selectedChannelId || providersLoading || isSubmitting}
                  error={!!fieldState.error}
                  helperText={
                    fieldState.error?.message ??
                    'Select a provider from the modules catalogue.'
                  }
                >
                  {!selectedChannelId ? (
                    <MenuItem value="" disabled>
                      Select a channel first
                    </MenuItem>
                  ) : providersLoading ? (
                    <MenuItem value="">
                      <em>Loading…</em>
                    </MenuItem>
                  ) : providers.length === 0 ? (
                    <MenuItem value="" disabled>
                      No providers for this channel
                    </MenuItem>
                  ) : (
                    providers.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.displayName}
                        {p.connectionType
                          ? ` — ${CONNECTION_TYPE_LABELS[p.connectionType] ?? p.connectionType}`
                          : ''}
                      </MenuItem>
                    ))
                  )}
                </TextField>
              )}
            />
          )}

          {/* ── Connection type info ─────────────────────────────────────────── */}
          {connectionType && (
            <Alert
              icon={<InfoOutlinedIcon fontSize="small" />}
              severity="info"
              sx={{ py: 0.75 }}
            >
              <Typography variant="body2">
                <strong>Connection type:</strong>{' '}
                {CONNECTION_TYPE_LABELS[connectionType] ?? connectionType}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                The connection type defines which credential form will be required later.
              </Typography>
            </Alert>
          )}

          {/* ── Flags ───────────────────────────────────────────────────────── */}
          <Box>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block', mb: 1, letterSpacing: 0.8 }}
            >
              Settings
            </Typography>
            <Stack spacing={0.5}>
              <ControlledSwitch
                name="isDefault"
                control={control}
                label="Set as default for this channel"
                disabled={isSubmitting}
              />
              <ControlledSwitch
                name="isActive"
                control={control}
                label="Active"
                disabled={isSubmitting}
              />
            </Stack>
          </Box>

          {/* ── Form-level error ─────────────────────────────────────────────── */}
          <FormError message={formError} />
        </Stack>
      </form>
    </FormDrawer>
  );
}
