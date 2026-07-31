'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
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
  useDeleteChannelProviderMutation,
  useChannels,
  useProviders,
} from '@/hooks/api/useCompanyChannelProviders';
import { useCreateCredentialsMutation } from '@/hooks/api/useProviderCredentials';
import { mapApiError } from '@/lib/mapApiError';
import { mapValidationErrors, extractValidationErrors } from '@/lib/mapValidationErrors';
import {
  getProviderCredentialConfig,
  type CredentialFieldConfig,
} from '@/lib/config/provider-credential-config';
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
  token:        'Token',
};

// ─── Inline credential field ──────────────────────────────────────────────────
// Renders a single credential field inline within the Enable Provider form.
// Driven by CredentialFieldConfig from the existing registry — not hardcoded per provider.

interface InlineCredentialFieldProps {
  fieldConfig: CredentialFieldConfig;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
}

function InlineCredentialField({
  fieldConfig,
  value,
  onChange,
  error,
  disabled,
}: InlineCredentialFieldProps) {
  const [showSecret, setShowSecret] = useState(false);
  const isPassword = fieldConfig.type === 'password';

  return (
    <TextField
      label={fieldConfig.label}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      type={isPassword ? (showSecret ? 'text' : 'password') : 'text'}
      fullWidth
      required={fieldConfig.required}
      disabled={disabled}
      placeholder={fieldConfig.placeholder}
      error={Boolean(error)}
      helperText={error ?? fieldConfig.helperText}
      inputProps={isPassword ? { autoComplete: 'new-password' } : undefined}
      InputProps={
        isPassword
          ? {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showSecret ? 'Hide' : 'Show'}
                    onClick={() => setShowSecret((s) => !s)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                    size="small"
                    tabIndex={-1}
                  >
                    {showSecret ? (
                      <VisibilityOffOutlinedIcon fontSize="small" />
                    ) : (
                      <VisibilityOutlinedIcon fontSize="small" />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            }
          : undefined
      }
    />
  );
}

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

  const createMutation       = useCreateChannelProviderMutation();
  const updateMutation       = useUpdateChannelProviderMutation();
  const deleteForRollback    = useDeleteChannelProviderMutation();
  const createCredentials    = useCreateCredentialsMutation();

  const [formError, setFormError] = useState<string | undefined>();

  // ── Credential field state (create mode only) ────────────────────────────
  // Managed separately from the CCP react-hook-form — credentials are a
  // distinct concern that get sent to a different endpoint.
  const [credValues, setCredValues]   = useState<Record<string, string>>({});
  const [credErrors, setCredErrors]   = useState<Record<string, string>>({});

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
      setCredValues({});
      setCredErrors({});
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Catalog queries (only needed in create mode)
  const { data: channels = [], isLoading: channelsLoading } = useChannels();
  const selectedChannelId = watch('channelId');
  const { data: providers = [], isLoading: providersLoading } = useProviders(
    isEditing ? undefined : selectedChannelId || undefined,
  );

  // Derived: selected provider and connection type
  const selectedProviderId = watch('providerId');
  const selectedProvider = providers.find((p) => p.id === selectedProviderId);
  const connectionType = isEditing
    ? (existing?.provider?.connectionType ?? '')
    : (selectedProvider?.connectionType ?? '');
  const selectedProviderKey = isEditing
    ? (existing?.provider?.providerKey ?? '')
    : (selectedProvider?.providerKey ?? '');

  // Credential config driven by connection type — null when no credentials needed
  const credConfig = !isEditing && connectionType
    ? getProviderCredentialConfig(selectedProviderKey || null, connectionType)
    : null;

  // Reset credential values when provider changes
  const prevProviderIdRef = useRef<string>('');
  useEffect(() => {
    if (selectedProviderId !== prevProviderIdRef.current) {
      prevProviderIdRef.current = selectedProviderId;
      setCredValues({});
      setCredErrors({});
    }
  }, [selectedProviderId]);

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
        feedback.onSuccess();
        return;
      }

      // ── CREATE: validate credentials if a config exists ─────────────────
      if (credConfig) {
        const newCredErrors: Record<string, string> = {};
        const allFields = [...credConfig.basicFields, ...credConfig.advancedFields];
        for (const f of allFields) {
          if (f.required && !credValues[f.key]?.trim()) {
            newCredErrors[f.key] = `${f.label} is required.`;
          }
        }
        if (Object.keys(newCredErrors).length > 0) {
          setCredErrors(newCredErrors);
          return;
        }
      }

      // ── Step 1: Create CompanyChannelProvider ───────────────────────────
      const createdCcp = await createMutation.mutateAsync({
        companyId,
        channelId:  values.channelId,
        providerId: values.providerId,
        isDefault:  values.isDefault,
        isActive:   values.isActive,
      });

      // ── Step 2: Create credentials (if required) ─────────────────────────
      if (credConfig) {
        const allFields = [...credConfig.basicFields, ...credConfig.advancedFields];
        const credPayload: Record<string, unknown> = {};
        for (const f of allFields) {
          const v = credValues[f.key]?.trim();
          if (v) credPayload[f.key] = v;
          else if (!f.required && f.defaultValue !== undefined) {
            credPayload[f.key] = f.defaultValue;
          }
        }

        try {
          await createCredentials.mutateAsync({
            companyChannelProviderId: createdCcp.id,
            tag: 'default',
            credentials: credPayload,
          });
        } catch (credErr: unknown) {
          // Rollback: remove the CCP that was just created.
          // Suppress rollback errors — the credential error is the one to report.
          await deleteForRollback
            .mutateAsync({ id: createdCcp.id, force: true })
            .catch(() => {});
          const data = (credErr as { response?: { data?: { message?: unknown } } })?.response?.data;
          const msg =
            Array.isArray(data?.message)
              ? data!.message.join(' ')
              : typeof data?.message === 'string'
              ? data.message
              : mapApiError(credErr);
          setFormError(`Credentials could not be saved: ${msg}`);
          return;
        }
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

          {/* ── Connection type badge ────────────────────────────────────────── */}
          {connectionType && (
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 1,
                border: 1,
                borderColor: 'divider',
                borderRadius: 1,
                bgcolor: 'action.hover',
              }}
            >
              <Typography variant="body2" color="text.secondary">
                Connection type:
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {CONNECTION_TYPE_LABELS[connectionType] ?? connectionType}
              </Typography>
            </Box>
          )}

          {/* ── Inline credentials (create mode, config-driven) ───────────────── */}
          {credConfig && (
            <>
              <Divider />
              <Box>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ display: 'block', mb: 1, letterSpacing: 0.8 }}
                >
                  Credentials
                </Typography>
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Enter the credentials required to connect this provider.
                  </Typography>
                  {credConfig.helperText && (
                    <Alert severity="info" icon={false} sx={{ py: 0.75 }}>
                      <Typography variant="body2">{credConfig.helperText}</Typography>
                    </Alert>
                  )}
                  {credConfig.basicFields.map((f) => (
                    <InlineCredentialField
                      key={f.key}
                      fieldConfig={f}
                      value={credValues[f.key] ?? ''}
                      onChange={(v) => {
                        setCredValues((prev) => ({ ...prev, [f.key]: v }));
                        if (credErrors[f.key]) {
                          setCredErrors((prev) => {
                            const next = { ...prev };
                            delete next[f.key];
                            return next;
                          });
                        }
                      }}
                      error={credErrors[f.key]}
                      disabled={isSubmitting}
                    />
                  ))}
                </Stack>
              </Box>
            </>
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
