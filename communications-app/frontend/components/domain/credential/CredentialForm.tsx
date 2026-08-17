'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQueryClient } from '@tanstack/react-query';
import Accordion from '@mui/material/Accordion';
import AccordionDetails from '@mui/material/AccordionDetails';
import AccordionSummary from '@mui/material/AccordionSummary';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import { useOAuthApplications, useCreateOAuthApplicationMutation, type OAuthApplication } from '@/hooks/api/useOAuthApplications';
import { useAuthStore } from '@/stores/auth.store';
import {
  useChannels,
  useProviders,
  useCompanyChannelProviders,
  useCreateChannelProviderMutation,
  useUpdateChannelProviderMutation,
  useDeleteChannelProviderMutation,
} from '@/hooks/api/useCompanyChannelProviders';
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
 * Drops a trailing "(...)" from a catalogue display name, e.g. "Gmail (OAuth)"
 * → "Gmail". Only used where the connection type is ALSO shown right next to
 * the name (a suffix or a badge) — avoids "Gmail (OAuth) ... OAuth 2.0".
 */
function stripConnectionTypeSuffix(name: string): string {
  return name.replace(/\s*\([^)]*\)\s*$/, '');
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
  /** Pre-selected CCP. When null (create without filter), the form renders a Channel + Provider catalogue picker. */
  selectedProvider: CompanyChannelProvider | null;
  /**
   * Override the company context. When omitted, falls back to the auth store's companyId.
   * Pass explicitly when used in a cross-company admin view (e.g. platform_admin on /companies/[id]).
   */
  companyId?: string | null;
  onClose: () => void;
}

// ─── RegisterOAuthApplicationDialog ────────────────────────────────────────────
// One-time registration of a reusable Client ID/Secret. Any channel's
// credential form can point at it afterwards via the "Reuse existing
// credential" picker instead of re-entering the secret.

interface RegisterOAuthApplicationDialogProps {
  open: boolean;
  providerFamily: string;
  onClose: () => void;
  onCreated: (app: OAuthApplication) => void;
}

export function RegisterOAuthApplicationDialog({ open, providerFamily, onClose, onCreated }: RegisterOAuthApplicationDialogProps) {
  const [displayName, setDisplayName] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const createMutation = useCreateOAuthApplicationMutation();

  useEffect(() => {
    if (open) { setDisplayName(''); setClientId(''); setClientSecret(''); }
  }, [open]);

  const canSave = displayName.trim() && clientId.trim() && clientSecret.trim();

  async function handleSave() {
    if (!canSave) return;
    const app = await createMutation.mutateAsync({
      providerFamily,
      displayName: displayName.trim(),
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
    });
    onCreated(app);
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Register a reusable {providerFamily} app</DialogTitle>
      <DialogContent>
        <Stack spacing={2} mt={1}>
          <Typography variant="body2" color="text.secondary">
            Paste the same Client ID/Secret you already use elsewhere (e.g. the Email channel).
            Any channel can reuse this afterwards without re-entering the secret.
          </Typography>
          <TextField label="Name" size="small" fullWidth value={displayName} onChange={(e) => setDisplayName(e.target.value)} placeholder="Google — main account" />
          <TextField label="Client ID" size="small" fullWidth value={clientId} onChange={(e) => setClientId(e.target.value)} placeholder="xxxxx.apps.googleusercontent.com" />
          <TextField label="Client Secret" size="small" fullWidth type="password" value={clientSecret} onChange={(e) => setClientSecret(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={createMutation.isPending}>Cancel</Button>
        <LoadingButton variant="contained" loading={createMutation.isPending} disabled={!canSave} onClick={handleSave}>
          Save
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
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
  const queryClient = useQueryClient();
  const pushSnack = useUIStore((s) => s.pushSnack);

  // ── "Just connected" continuation ───────────────────────────────────────────
  // After creating a brand-new OAuth connection, the drawer stays open and
  // flips into an edit-like state (instead of closing) so the Connect button
  // appears immediately — no separate trip to find the credential afterwards.
  const [justCreatedCredential, setJustCreatedCredential] = useState<ProviderCredentials | null>(null);
  const [justCreatedCcp, setJustCreatedCcp] = useState<CompanyChannelProvider | null>(null);

  const activeCredential = credential ?? justCreatedCredential;
  const isEditing = Boolean(activeCredential);

  // ── Catalogue picker (create mode, no CCP pre-selected) ─────────────────────
  // Lets the user pick Channel + Provider directly from the modules
  // catalogue — same as "Enable Provider" used to — instead of only from
  // already-enabled connections. If that combination isn't enabled yet, the
  // same submit silently enables it first, then saves the credential.
  const showCatalogPicker = !isEditing && !selectedProvider;
  const [catalogChannelId, setCatalogChannelId] = useState('');
  const [catalogProviderId, setCatalogProviderId] = useState('');

  const { data: channels = [] } = useChannels();
  const { data: catalogProviders = [], isLoading: catalogProvidersLoading } = useProviders(
    showCatalogPicker ? (catalogChannelId || undefined) : undefined,
  );
  const catalogChannel  = channels.find((c) => c.id === catalogChannelId);
  const catalogProvider = catalogProviders.find((p) => p.id === catalogProviderId);

  // Existing CCPs for this company — used to silently reuse an already-enabled
  // connection instead of creating a duplicate.
  const { data: ccpData } = useCompanyChannelProviders(
    showCatalogPicker ? companyId : null,
    { populate: true },
  );
  const allCcps = ccpData?.items ?? [];
  const existingCcpForCatalogPick = catalogProviderId
    ? allCcps.find((p) => p.provider?.id === catalogProviderId) ?? null
    : null;

  const createCcpMutation = useCreateChannelProviderMutation();
  const updateCcpMutation = useUpdateChannelProviderMutation();
  const deleteCcpForRollback = useDeleteChannelProviderMutation();

  // The active CompanyChannelProvider context, whichever phase we're in.
  const effectiveProvider: CompanyChannelProvider | null =
    selectedProvider ?? justCreatedCcp ?? existingCcpForCatalogPick ?? null;

  const createMutation = useCreateCredentialsMutation();
  const updateMutation = useUpdateCredentialsMutation();
  const testMutation   = useTestCredentialsMutation();
  const [formError, setFormError] = useState<string | undefined>();
  const [isTesting, setIsTesting] = useState(false);

  // Provider identity: prefer the resolved CCP; fall back to the raw catalogue
  // pick when the connection doesn't exist yet.
  const providerKey    = effectiveProvider?.provider?.providerKey    ?? catalogProvider?.providerKey;
  const connectionType = effectiveProvider?.provider?.connectionType ?? catalogProvider?.connectionType;
  const config = getProviderCredentialConfig(providerKey, connectionType);
  const allFields = config ? [...config.basicFields, ...config.advancedFields] : [];
  const hasAdvanced = (config?.advancedFields.length ?? 0) > 0;

  const {
    control,
    handleSubmit,
    reset,
    setError,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CredentialFormValues>({
    resolver: zodResolver(credentialFormSchema),
    mode: 'onBlur',
    defaultValues: { tag: '', isActive: true },
  });

  // Reset form and internal state when drawer opens
  useEffect(() => {
    if (open) {
      setCatalogChannelId('');
      setCatalogProviderId('');
      setJustCreatedCredential(null);
      setJustCreatedCcp(null);
      const defaults: Partial<CredentialFormValues> = {
        tag: credential?.tag ?? '',
        isActive: credential?.isActive ?? true,
      };
      reset(defaults as CredentialFormValues);
      setFormError(undefined);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-apply create-mode field defaults once a config becomes known (e.g. after
  // picking a provider from the catalogue).
  useEffect(() => {
    if (open && !isEditing && config) {
      for (const f of allFields) {
        if ((f.type === 'boolean' || f.type === 'select') && f.defaultValue !== undefined) {
          reset((prev) => ({ ...prev, [f.key]: f.defaultValue }) as CredentialFormValues);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [providerKey, connectionType]);

  const oauthConfig = config?.oauthConfig;

  // ── Ecosystem vs. Developer mode ────────────────────────────────────────────
  // Ecosystem: use Relay's own (platform company's) registered app — no
  // Client ID/Secret needed, just click Connect. Developer: bring your own
  // Google Cloud app. Same OAuth machinery either way — only where the
  // clientId/clientSecret come from differs.
  const providerFamily = oauthConfig?.providerFamily;
  const { data: oauthApps = [] } = useOAuthApplications(providerFamily);
  const ecosystemApps = oauthApps.filter((a) => a.isEcosystem);
  const ownApps = oauthApps.filter((a) => !a.isEcosystem);
  const ecosystemAppId = ecosystemApps[0]?.id ?? '';

  const [authMode, setAuthMode] = useState<'ecosystem' | 'developer'>('ecosystem');
  const [reuseAppId, setReuseAppId] = useState('');
  const [registerAppOpen, setRegisterAppOpen] = useState(false);

  useEffect(() => {
    if (open) { setReuseAppId(''); setRegisterAppOpen(false); setAuthMode('ecosystem'); }
  }, [open]);

  // Effective OAuth application to submit: ecosystem mode always uses the
  // platform's app; developer mode uses a reused own-app selection if any.
  const effectiveOAuthAppId = providerFamily
    ? (authMode === 'ecosystem' ? ecosystemAppId : reuseAppId)
    : '';

  // ── "Set as default for this channel" ───────────────────────────────────────
  // Lives on the CompanyChannelProvider record, not the credential — this form
  // now owns both, so it exposes the toggle here instead of a separate page.
  const [isDefaultChannel, setIsDefaultChannel] = useState(false);
  useEffect(() => {
    if (open) setIsDefaultChannel(effectiveProvider?.isDefault ?? false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, effectiveProvider?.id]);

  const feedback = useCrudFeedback({
    successMessage: isEditing ? 'Credentials updated' : 'Credentials added',
    queryKeys: [['provider-credentials'], ['company-channel-providers']],
    onSuccess: onClose,
  });

  const handleTest = useCallback(async () => {
    if (!activeCredential) return;
    setIsTesting(true);
    try {
      const result = await testMutation.mutateAsync(activeCredential.id);
      pushSnack({
        type: result.success ? 'success' : 'error',
        message: result.success
          ? `${result.provider}: ${result.message}`
          : result.message,
      });
    } catch (e) {
      pushSnack({ type: 'error', message: extractCredentialError(e, { credentialId: activeCredential.id }) });
    } finally {
      setIsTesting(false);
    }
  }, [activeCredential, testMutation, pushSnack]);

  const onSubmit = async (values: CredentialFormValues) => {
    setFormError(undefined);
    let requestPayload: unknown;
    try {
      if (isEditing && activeCredential) {
        let credPayload = buildCredentialPayload(values, allFields, true);
        if (effectiveOAuthAppId) credPayload = { ...(credPayload ?? {}), oauthApplicationId: effectiveOAuthAppId };
        requestPayload = {
          id: activeCredential.id,
          tag: values.tag,
          isActive: values.isActive,
          ...(credPayload ? { credentials: credPayload } : {}),
          ...(providerFamily ? { oauthAppSource: authMode === 'ecosystem' ? 'ecosystem' : 'own' } : {}),
        };
        await updateMutation.mutateAsync(requestPayload as Parameters<typeof updateMutation.mutateAsync>[0]);
        if (effectiveProvider?.id && isDefaultChannel !== (effectiveProvider.isDefault ?? false)) {
          await updateCcpMutation.mutateAsync({ id: effectiveProvider.id, isDefault: isDefaultChannel });
        }
        feedback.onSuccess();
      } else {
        // ── CREATE: resolve (or silently enable) the target connection first ──
        let targetCcp = effectiveProvider;
        let freshlyCreatedCcp = false;
        if (!targetCcp) {
          if (!catalogChannel || !catalogProvider) {
            setFormError('Select a channel and provider first.');
            return;
          }
          targetCcp = await createCcpMutation.mutateAsync({
            companyId: companyId as string,
            channelId: catalogChannel.id,
            providerId: catalogProvider.id,
            isDefault: isDefaultChannel,
            isActive: true,
          });
          freshlyCreatedCcp = true;
        } else if (isDefaultChannel !== (targetCcp.isDefault ?? false)) {
          await updateCcpMutation.mutateAsync({ id: targetCcp.id, isDefault: isDefaultChannel });
        }

        const credPayload = buildCredentialPayload(values, allFields, false) ?? {};
        if (effectiveOAuthAppId) credPayload.oauthApplicationId = effectiveOAuthAppId;
        requestPayload = {
          companyChannelProviderId: targetCcp.id,
          tag: values.tag,
          credentials: credPayload,
          ...(providerFamily ? { oauthAppSource: authMode === 'ecosystem' ? 'ecosystem' : 'own' } : {}),
        };
        let created: ProviderCredentials;
        try {
          created = await createMutation.mutateAsync(requestPayload as Parameters<typeof createMutation.mutateAsync>[0]);
        } catch (credErr) {
          // Roll back the connection we just enabled — the credential error is the one to report.
          if (freshlyCreatedCcp) {
            await deleteCcpForRollback.mutateAsync({ id: targetCcp.id, force: true }).catch(() => {});
          }
          throw credErr;
        }

        if (oauthConfig) {
          // Stay open and flip to "edit" so the Connect button shows right away.
          pushSnack({ type: 'success', message: 'Credentials saved — click Connect below to finish.' });
          queryClient.invalidateQueries({ queryKey: ['provider-credentials'] });
          queryClient.invalidateQueries({ queryKey: ['company-channel-providers'] });
          setJustCreatedCcp(targetCcp);
          setJustCreatedCredential(created);
        } else {
          feedback.onSuccess();
        }
      }
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
    <>
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
            disabled={isTesting || (!isEditing && !effectiveProvider && !(catalogChannel && catalogProvider))}
          >
            {isEditing ? 'Save Changes' : 'Add Credentials'}
          </LoadingButton>
        </>
      }
    >
      <form id={FORM_ID} onSubmit={handleSubmit(onSubmit)} noValidate>
        <Stack spacing={3}>

          {/* ── Channel + Provider catalogue picker (create mode only) ─────── */}
          {showCatalogPicker && (
            <Stack spacing={2}>
              <FormControl fullWidth size="medium">
                <InputLabel>Channel *</InputLabel>
                <Select
                  value={catalogChannelId}
                  label="Channel *"
                  onChange={(e) => { setCatalogChannelId(e.target.value); setCatalogProviderId(''); }}
                  disabled={isSubmitting}
                >
                  {channels.length === 0 ? (
                    <MenuItem value="" disabled><em>Loading…</em></MenuItem>
                  ) : (
                    channels.map((ch) => (
                      <MenuItem key={ch.id} value={ch.id}>{ch.displayName}</MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <FormControl fullWidth size="medium">
                <InputLabel>Provider *</InputLabel>
                <Select
                  value={catalogProviderId}
                  label="Provider *"
                  onChange={(e) => setCatalogProviderId(e.target.value)}
                  disabled={isSubmitting || !catalogChannelId || catalogProvidersLoading}
                >
                  {!catalogChannelId ? (
                    <MenuItem value="" disabled>Select a channel first</MenuItem>
                  ) : catalogProviders.length === 0 ? (
                    <MenuItem value="" disabled><em>No providers for this channel</em></MenuItem>
                  ) : (
                    catalogProviders.map((p) => (
                      <MenuItem key={p.id} value={p.id}>
                        {p.connectionType ? stripConnectionTypeSuffix(p.displayName) : p.displayName}
                        {p.connectionType ? ` — ${CONNECTION_TYPE_LABELS[p.connectionType] ?? p.connectionType}` : ''}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>
            </Stack>
          )}

          {/* ── Provider context (read-only once resolved) ──────────────────── */}
          {effectiveProvider ? (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Provider
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={500}>
                  {ctLabel ? stripConnectionTypeSuffix(getProviderName(effectiveProvider)) : getProviderName(effectiveProvider)}
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
          ) : catalogProvider && catalogChannel && (
            <Box>
              <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                Provider
              </Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                <Typography variant="body2" fontWeight={500}>
                  {ctLabel ? stripConnectionTypeSuffix(catalogProvider.displayName) : catalogProvider.displayName}
                </Typography>
                <Typography variant="caption" color="text.secondary">· {catalogChannel.displayName}</Typography>
                {ctLabel && <Chip icon={<LockOutlinedIcon />} label={ctLabel} size="small" variant="outlined" />}
              </Stack>
              <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                Not enabled yet — saving will enable it for this company.
              </Typography>
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

          {/* ── Auth mode tabs (Ecosystem / Developer) — OAuth providers only ── */}
          {providerFamily ? (
            <Box>
              <Stack direction="row" spacing={0} sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
                <Box
                  onClick={() => setAuthMode('ecosystem')}
                  sx={{
                    px: 1.75, py: 1, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    color: authMode === 'ecosystem' ? 'primary.main' : 'text.secondary',
                    borderBottom: 2, borderColor: authMode === 'ecosystem' ? 'primary.main' : 'transparent',
                    mb: '-1px',
                  }}
                >
                  Ecosystem
                </Box>
                <Box
                  onClick={() => setAuthMode('developer')}
                  sx={{
                    px: 1.75, py: 1, fontSize: 13, fontWeight: 500, cursor: 'pointer',
                    color: authMode === 'developer' ? 'primary.main' : 'text.secondary',
                    borderBottom: 2, borderColor: authMode === 'developer' ? 'primary.main' : 'transparent',
                    mb: '-1px',
                  }}
                >
                  Developer
                </Box>
              </Stack>

              {authMode === 'ecosystem' ? (
                <Stack spacing={1.5}>
                  <Typography variant="body2" color="text.secondary">
                    Uses Relay&apos;s own Google connection — no setup needed on your side. Click Connect and pick which account to link.
                  </Typography>
                  {!ecosystemAppId && (
                    <Alert severity="warning" sx={{ py: 0.75 }}>
                      No ecosystem app is configured for this provider yet. Use the Developer tab, or ask your platform admin to register one.
                    </Alert>
                  )}
                </Stack>
              ) : (
                <Stack spacing={2}>
                  <Typography variant="body2" color="text.secondary">
                    Bring your own Google Cloud app to build your own integration on Relay&apos;s API.
                  </Typography>
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
                  {ownApps.length > 0 && (
                    <FormControl fullWidth size="small" disabled={isSubmitting}>
                      <InputLabel>Reuse one of your own apps</InputLabel>
                      <Select
                        value={reuseAppId}
                        label="Reuse one of your own apps"
                        onChange={(e) => setReuseAppId(e.target.value)}
                      >
                        <MenuItem value=""><em>None — use the Client ID/Secret above</em></MenuItem>
                        {ownApps.map((app) => (
                          <MenuItem key={app.id} value={app.id}>
                            {app.displayName} ({app.clientId})
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  <Button size="small" sx={{ alignSelf: 'flex-start' }} onClick={() => setRegisterAppOpen(true)} disabled={isSubmitting}>
                    + Register app for reuse
                  </Button>
                </Stack>
              )}
            </Box>
          ) : (
            config?.basicFields.map((f) => (
              <CredentialField
                key={f.key}
                fieldConfig={f}
                control={control}
                errors={errors}
                isSubmitting={isSubmitting}
                isEditing={isEditing}
              />
            ))
          )}

          {/* ── OAuth connection panel (OAuth providers only, edit mode) ──
               Rendered after the credential fields so the flow reads top to
               bottom: enter your app credentials, then connect. */}
          {isEditing && oauthConfig && activeCredential && (
            !providerFamily
              // Single-mode OAuth providers (Xero, Identity, Google/Outlook
              // Calendar, ...) have no Ecosystem/Developer split — once a
              // credential exists, Connect is always available.
              ? true
              : authMode === 'developer'
                ? activeCredential.oauthAppSource === 'own' || Boolean(watch('clientId')) || Boolean(reuseAppId)
                : activeCredential.oauthAppSource !== 'own' && Boolean(ecosystemAppId)
          ) && (
            <OAuthConnectPanel
              oauthBasePath={oauthConfig.basePath}
              credentialId={activeCredential.id}
              providerName={effectiveProvider ? getProviderName(effectiveProvider) : 'Provider'}
              displayIdentifier={activeCredential.displayIdentifier}
              supportsOrganisations={oauthConfig.supportsOrganisations}
              onDisconnected={onClose}
            />
          )}

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

          {/* ── Channel-provider settings ─────────────────────────────────── */}
          <FormControlLabel
            control={
              <Switch
                checked={isDefaultChannel}
                onChange={(e) => setIsDefaultChannel(e.target.checked)}
                disabled={isSubmitting}
              />
            }
            label="Set as default for this channel"
          />

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
    {providerFamily && (
      <RegisterOAuthApplicationDialog
        open={registerAppOpen}
        providerFamily={providerFamily}
        onClose={() => setRegisterAppOpen(false)}
        onCreated={(app) => setReuseAppId(app.id)}
      />
    )}
    </>
  );
}
