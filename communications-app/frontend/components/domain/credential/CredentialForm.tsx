'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import NetworkCheckOutlinedIcon from '@mui/icons-material/NetworkCheckOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlinedIcon from '@mui/icons-material/VisibilityOffOutlined';
import {
  FormDrawer,
  FormError,
  LoadingButton,
  ControlledTextField,
  ControlledSwitch,
} from '@/components/shared';
import { useCrudFeedback } from '@/hooks/useCrudFeedback';
import {
  useCreateCredentialsMutation,
  useUpdateCredentialsMutation,
  useTestCredentialsMutation,
} from '@/hooks/api/useProviderCredentials';
import { useUIStore } from '@/stores/ui.store';
import { mapApiError } from '@/lib/mapApiError';
import { mapValidationErrors, extractValidationErrors } from '@/lib/mapValidationErrors';
import {
  getProviderCredentialConfig,
  type CredentialFieldConfig,
} from '@/lib/config/provider-credential-config';
import { OAuthConnectPanel } from './OAuthConnectPanel';
import { useAuthStore } from '@/stores/auth.store';
import { useCompanyChannelProviders } from '@/hooks/api/useCompanyChannelProviders';
import type { CompanyChannelProvider, ProviderCredentials } from '@/types/api';

// ─── Schema ───────────────────────────────────────────────────────────────────
// All credential fields are optional on the client — server-side validation
// enforces required fields per provider contract.

const credentialFormSchema = z.object({
  tag: z
    .string()
    .min(1, 'Tag is required.')
    .max(100)
    .regex(/^[a-z0-9_-]+$/, 'Use lowercase letters, numbers, hyphens, or underscores.'),
  isActive: z.boolean(),
  // SMTP
  host:    z.string().optional(),
  port:    z.coerce.number().optional(),
  secure:  z.boolean().optional(),
  user:    z.string().optional(),
  pass:    z.string().optional(),
  // API Key
  apiKey:  z.string().optional(),
  // OAuth
  clientId:     z.string().optional(),
  clientSecret: z.string().optional(),
  accessToken:  z.string().optional(),
  refreshToken: z.string().optional(),
  // Twilio
  accountSid: z.string().optional(),
  authToken:  z.string().optional(),
  fromNumber: z.string().optional(),
  // S3
  accessKeyId:     z.string().optional(),
  secretAccessKey: z.string().optional(),
  region:          z.string().optional(),
  bucket:          z.string().optional(),
  endpoint:        z.string().optional(),
  publicBaseUrl:   z.string().optional(),
  // Common optional
  fromEmail:  z.string().optional(),
  fromName:   z.string().optional(),
  replyTo:    z.string().optional(),
  // Mailgun
  domain:  z.string().optional(),
  baseUrl: z.string().optional(),
  // iCloud Calendar (app_password)
  appleId:             z.string().optional(),
  appSpecificPassword: z.string().optional(),
  // Outlook Calendar (OAuth via Azure AD)
  tenantId: z.string().optional(),
  // Stripe (payment / api_key)
  secretKey:      z.string().optional(),
  publishableKey: z.string().optional(),
  webhookSecret:  z.string().optional(),
  mode:           z.string().optional(),
  // Token-based providers (CoinGate, generic token)
  token: z.string().optional(),
});

type CredentialFormValues = z.infer<typeof credentialFormSchema>;

const FORM_ID = 'credential-form';

// ─── Error helpers ────────────────────────────────────────────────────────────

/**
 * Extracts the backend error message and logs the full error for debugging.
 * Prefers response.data.message (string or string[]) over generic text.
 */
function extractCredentialError(error: unknown, payload?: unknown): string {
  console.error('[CredentialForm] error', {
    status:   (error as any)?.response?.status,
    data:     (error as any)?.response?.data,
    payload,
  });

  const data = (error as any)?.response?.data as { message?: unknown } | undefined;
  if (data?.message) {
    if (Array.isArray(data.message)) return data.message.join('\n');
    if (typeof data.message === 'string') return data.message;
  }

  if (!(error as any)?.response) return 'Cannot reach the server. Please check your connection.';
  const status = (error as any).response.status as number;
  if (status === 401) return 'Your session has expired. Please sign in again.';
  if (status === 403) return 'You do not have permission to perform this action.';
  if (status === 404) return 'The requested resource could not be found.';
  return `Unexpected error (HTTP ${status ?? 'unknown'}). See browser console for details.`;
}

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  api_key:      'API Key',
  smtp:         'SMTP',
  oauth:        'OAuth 2.0',
  access_keys:  'Access Keys',
  app_password: 'App Password',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getProviderName(ccp: CompanyChannelProvider): string {
  return ccp.provider?.displayName ?? String(ccp.providerId);
}

function getChannelName(ccp: CompanyChannelProvider): string {
  return ccp.channel?.displayName ?? String(ccp.channelId);
}

/**
 * Builds the credentials payload from form values using the config field list.
 *
 * Create mode: all fields with values + defaults for blank optional fields.
 * Edit mode: returns null if ALL text/password/number fields are blank
 *           (user wants to keep existing encrypted values).
 *           Returns a partial payload if any are filled.
 */
function buildCredentialPayload(
  values: CredentialFormValues,
  allFields: CredentialFieldConfig[],
  isEditing: boolean,
): Record<string, unknown> | null {
  const payload: Record<string, unknown> = {};
  let hasAnyFilled = false;

  // Text / password / number fields
  for (const field of allFields) {
    if (field.type === 'boolean') continue;
    const raw = (values as Record<string, unknown>)[field.key];
    const str = raw != null ? String(raw).trim() : '';

    if (str !== '') {
      hasAnyFilled = true;
      payload[field.key] = field.type === 'number' ? Number(raw) : str;
    } else if (!isEditing && field.defaultValue !== undefined) {
      payload[field.key] = field.defaultValue;
    }
  }

  if (isEditing && !hasAnyFilled) return null;

  // Boolean fields — always included in create; included in edit only when
  // other fields changed (so the backend stores the right toggle state too)
  for (const field of allFields) {
    if (field.type !== 'boolean') continue;
    const val = (values as Record<string, unknown>)[field.key];
    if (!isEditing || hasAnyFilled) {
      payload[field.key] = val !== undefined ? Boolean(val) : (field.defaultValue ?? false);
    }
  }

  return payload;
}

// ─── Single credential field renderer ────────────────────────────────────────

interface CredentialFieldProps {
  fieldConfig: CredentialFieldConfig;
  control: ReturnType<typeof useForm<CredentialFormValues>>['control'];
  errors: ReturnType<typeof useForm<CredentialFormValues>>['formState']['errors'];
  isSubmitting: boolean;
  isEditing: boolean;
}

function CredentialField({ fieldConfig, control, errors, isSubmitting, isEditing }: CredentialFieldProps) {
  const { key, label, type, required, placeholder, helperText } = fieldConfig;
  const [showSecret, setShowSecret] = useState(false);

  if (type === 'boolean') {
    return (
      <Controller
        name={key as keyof CredentialFormValues}
        control={control}
        render={({ field }) => (
          <FormControlLabel
            control={
              <Switch
                checked={Boolean(field.value ?? fieldConfig.defaultValue ?? false)}
                onChange={(e) => field.onChange(e.target.checked)}
                disabled={isSubmitting}
              />
            }
            label={label}
          />
        )}
      />
    );
  }

  if (type === 'select') {
    const fieldError = (errors as Record<string, { message?: string }>)[key];
    return (
      <Controller
        name={key as keyof CredentialFormValues}
        control={control}
        render={({ field }) => (
          <FormControl fullWidth size="small" error={Boolean(fieldError)} disabled={isSubmitting}>
            <InputLabel required={required && !isEditing}>{label}</InputLabel>
            <Select
              value={field.value ?? fieldConfig.defaultValue ?? ''}
              label={label}
              onChange={(e) => field.onChange(e.target.value)}
            >
              {(fieldConfig.options ?? []).map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
            {(fieldError?.message || helperText) && (
              <FormHelperText>{fieldError?.message ?? helperText}</FormHelperText>
            )}
          </FormControl>
        )}
      />
    );
  }

  const fieldError = (errors as Record<string, { message?: string }>)[key];
  const isPassword = type === 'password';
  const resolvedType = isPassword
    ? (showSecret ? 'text' : 'password')
    : type === 'number' ? 'number' : 'text';

  return (
    <Controller
      name={key as keyof CredentialFormValues}
      control={control}
      render={({ field }) => (
        <TextField
          {...field}
          value={field.value ?? ''}
          label={label}
          type={resolvedType}
          fullWidth
          required={required && !isEditing}
          disabled={isSubmitting}
          placeholder={placeholder}
          error={Boolean(fieldError)}
          helperText={fieldError?.message ?? helperText}
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
                        {showSecret
                          ? <VisibilityOffOutlinedIcon fontSize="small" />
                          : <VisibilityOutlinedIcon fontSize="small" />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }
              : undefined
          }
          onChange={(e) => field.onChange(e.target.value)}
        />
      )}
    />
  );
}

// ─── CredentialForm ───────────────────────────────────────────────────────────

interface CredentialFormProps {
  open: boolean;
  credential: ProviderCredentials | null;
  /** Pre-selected CCP. When null (create without filter), the form renders a CCP picker. */
  selectedProvider: CompanyChannelProvider | null;
  /**
   * Override the company context. When omitted, falls back to the auth store's companyId.
   * Pass explicitly when used in a cross-company admin view (e.g. platform_admin on /companies/[id]).
   */
  companyId?: string | null;
  onClose: () => void;
}

export function CredentialForm({
  open,
  credential,
  selectedProvider,
  companyId: companyIdProp,
  onClose,
}: CredentialFormProps) {
  const authCompanyId = useAuthStore((s) => s.companyId);
  const companyId = companyIdProp ?? authCompanyId;
  const isEditing  = Boolean(credential);

  // Internal CCP state — used in create mode when no CCP is pre-selected
  const [internalProvider, setInternalProvider] = useState<CompanyChannelProvider | null>(null);
  const effectiveProvider = selectedProvider ?? internalProvider;

  // Fetch CCPs for the picker (only needed when no CCP pre-selected in create mode)
  const { data: ccpData } = useCompanyChannelProviders(
    !selectedProvider && !isEditing ? companyId : null,
    { populate: true },
  );
  const allProviders = ccpData?.items ?? [];

  const createMutation = useCreateCredentialsMutation();
  const updateMutation = useUpdateCredentialsMutation();
  const testMutation   = useTestCredentialsMutation();
  const pushSnack      = useUIStore((s) => s.pushSnack);
  const [formError, setFormError] = useState<string | undefined>();
  const [isTesting, setIsTesting] = useState(false);

  const providerKey    = effectiveProvider?.provider?.providerKey;
  const connectionType = effectiveProvider?.provider?.connectionType;
  const config = getProviderCredentialConfig(providerKey, connectionType);
  const allFields = config ? [...config.basicFields, ...config.advancedFields] : [];
  const hasAdvanced = (config?.advancedFields.length ?? 0) > 0;

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialFormSchema),
    mode: 'onBlur',
    defaultValues: { tag: '', isActive: true },
  });

  // Reset form and internal provider when drawer opens
  useEffect(() => {
    if (open) {
      setInternalProvider(null);
      const defaults: Partial<CredentialFormValues> = {
        tag: credential?.tag ?? '',
        isActive: credential?.isActive ?? true,
      };
      if (!isEditing && config) {
        for (const f of allFields) {
          if ((f.type === 'boolean' || f.type === 'select') && f.defaultValue !== undefined) {
            (defaults as Record<string, unknown>)[f.key] = f.defaultValue;
          }
        }
      }
      reset(defaults as CredentialFormValues);
      setFormError(undefined);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  const oauthConfig = config?.oauthConfig;
  const oauthSuccessMessage = oauthConfig && !isEditing
    ? `Credentials saved. Open Edit to connect with ${getProviderName(effectiveProvider as any)}.`
    : undefined;

  const feedback = useCrudFeedback({
    successMessage: oauthSuccessMessage ?? (isEditing ? 'Credentials updated' : 'Credentials added'),
    queryKeys: [['provider-credentials']],
    onSuccess: onClose,
  });

  const handleTest = useCallback(async () => {
    if (!credential) return;
    setIsTesting(true);
    try {
      const result = await testMutation.mutateAsync(credential.id);
      pushSnack({
        type: result.success ? 'success' : 'error',
        message: result.success
          ? `${result.provider}: ${result.message}`
          : result.message,
      });
    } catch (e) {
      pushSnack({ type: 'error', message: extractCredentialError(e, { credentialId: credential.id }) });
    } finally {
      setIsTesting(false);
    }
  }, [credential, testMutation, pushSnack]);

  const onSubmit = async (values: CredentialFormValues) => {
    setFormError(undefined);
    let requestPayload: unknown;
    try {
      if (isEditing && credential) {
        const credPayload = buildCredentialPayload(values, allFields, true);
        requestPayload = {
          id: credential.id,
          tag: values.tag,
          isActive: values.isActive,
          ...(credPayload ? { credentials: credPayload } : {}),
        };
        await updateMutation.mutateAsync(requestPayload as Parameters<typeof updateMutation.mutateAsync>[0]);
      } else {
        if (!effectiveProvider) {
          setFormError('Select a channel provider first.');
          return;
        }
        const credPayload = buildCredentialPayload(values, allFields, false) ?? {};
        requestPayload = {
          companyChannelProviderId: effectiveProvider.id,
          tag: values.tag,
          credentials: credPayload,
        };
        await createMutation.mutateAsync(requestPayload as Parameters<typeof createMutation.mutateAsync>[0]);
      }
      feedback.onSuccess();
    } catch (e: unknown) {
      const validationErrors = extractValidationErrors(e);
      if (validationErrors) {
        const mapped = mapValidationErrors(validationErrors);
        for (const [field, message] of Object.entries(mapped)) {
          if (field === '_form') setFormError(message);
          else setError(field as keyof CredentialFormValues, { message });
        }
        if (!mapped['_form']) setFormError(undefined);
        return;
      }
      setFormError(extractCredentialError(e, requestPayload));
    }
  };

  const ctLabel = connectionType
    ? (CONNECTION_TYPE_LABELS[connectionType] ?? connectionType)
    : '';

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={isEditing ? 'Edit Credentials' : 'Add Credentials'}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={isSubmitting || isTesting}>
            Cancel
          </Button>
          {isEditing && (
            <LoadingButton
              variant="outlined"
              loading={isTesting}
              disabled={isSubmitting || isTesting}
              onClick={handleTest}
              startIcon={<NetworkCheckOutlinedIcon />}
            >
              Test
            </LoadingButton>
          )}
          <LoadingButton
            type="submit"
            form={FORM_ID}
            variant="contained"
            loading={isSubmitting}
            disabled={isTesting || (!isEditing && !effectiveProvider)}
          >
            {isEditing ? 'Save Changes' : 'Add Credentials'}
          </LoadingButton>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={3}>

          {/* ── CCP picker (create mode, no pre-selected provider) ────────── */}
          {!isEditing && !selectedProvider && (
            <FormControl fullWidth size="medium">
              <InputLabel>Channel Provider *</InputLabel>
              <Select
                value={internalProvider?.id ?? ''}
                label="Channel Provider *"
                onChange={(e) => {
                  const found = allProviders.find((p) => p.id === e.target.value) ?? null;
                  setInternalProvider(found);
                }}
                disabled={isSubmitting}
              >
                {allProviders.length === 0 ? (
                  <MenuItem value="" disabled>
                    <em>No active providers configured</em>
                  </MenuItem>
                ) : (
                  allProviders.map((p) => (
                    <MenuItem key={p.id} value={p.id}>
                      {p.channel?.displayName ?? String(p.channelId)} — {p.provider?.displayName ?? String(p.providerId)}
                    </MenuItem>
                  ))
                )}
              </Select>
            </FormControl>
          )}

          {/* ── Provider context (read-only when pre-selected or after pick) ─ */}
          {effectiveProvider && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Provider
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={500}>
                  {getProviderName(effectiveProvider)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  · {getChannelName(effectiveProvider)}
                </Typography>
                {ctLabel && (
                  <Chip
                    icon={<LockOutlinedIcon />}
                    label={ctLabel}
                    size="small"
                    variant="outlined"
                  />
                )}
              </Stack>
            </Box>
          )}

          {/* ── Tag ─────────────────────────────────────────────────────── */}
          <ControlledTextField
            name="tag"
            control={control}
            label="Tag"
            required
            disabled={isSubmitting}
            placeholder="marketing"
            helperText="Identifier for this credential set, e.g. marketing, support, transactional"
          />

          {/* ── OAuth connection panel (OAuth providers only, edit mode) ── */}
          {isEditing && oauthConfig && credential && (
            <OAuthConnectPanel
              oauthBasePath={oauthConfig.basePath}
              credentialId={credential.id}
              providerName={effectiveProvider ? getProviderName(effectiveProvider) : 'Provider'}
              displayIdentifier={credential.displayIdentifier}
              supportsOrganisations={oauthConfig.supportsOrganisations}
              onDisconnected={onClose}
            />
          )}

          {/* ── Edit mode: encrypted-values notice ──────────────────────── */}
          {isEditing && (
            <Alert severity="info" sx={{ py: 0.75 }}>
              <Typography variant="body2">
                Existing secret values are encrypted and are not displayed.
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.25}>
                Leave all fields blank to keep existing credentials, or fill them in to replace the entire credential set.
              </Typography>
            </Alert>
          )}

          {/* ── Provider helper text ─────────────────────────────────────── */}
          {config?.helperText && (
            <Alert severity="info" icon={false} sx={{ py: 0.75 }}>
              <Typography variant="body2">{config.helperText}</Typography>
            </Alert>
          )}

          {/* ── No config fallback ──────────────────────────────────────── */}
          {!config && connectionType && (
            <Alert severity="warning">
              No credential template found for this connection type. Contact your platform admin.
            </Alert>
          )}

          {/* ── Basic fields ─────────────────────────────────────────────── */}
          {config?.basicFields.map((f) => (
            <CredentialField
              key={f.key}
              fieldConfig={f}
              control={control}
              errors={errors}
              isSubmitting={isSubmitting}
              isEditing={isEditing}
            />
          ))}

          {/* ── Advanced settings (collapsible) ─────────────────────────── */}
          {hasAdvanced && (
            <Accordion
              disableGutters
              elevation={0}
              sx={{
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                '&:before': { display: 'none' },
              }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2, minHeight: 44 }}>
                <Typography variant="body2" fontWeight={500}>
                  Advanced Settings
                </Typography>
              </AccordionSummary>
              <AccordionDetails sx={{ px: 2, pb: 2 }}>
                <Stack spacing={2}>
                  {(config?.advancedFields ?? []).map((f) => (
                    <CredentialField
                      key={f.key}
                      fieldConfig={f}
                      control={control}
                      errors={errors}
                      isSubmitting={isSubmitting}
                      isEditing={isEditing}
                    />
                  ))}
                </Stack>
              </AccordionDetails>
            </Accordion>
          )}

          {/* ── Active flag (edit only) ──────────────────────────────────── */}
          {isEditing && (
            <ControlledSwitch
              name="isActive"
              control={control}
              label="Active"
              disabled={isSubmitting}
            />
          )}

          {/* ── Form-level error ─────────────────────────────────────────── */}
          <FormError message={formError} />
        </Stack>
      </form>
    </FormDrawer>
  );
}
