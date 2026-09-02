'use client';

import React, { useState } from 'react';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Alert from '@mui/material/Alert';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import { PageHeader } from '@/components/layout';
import { PermissionGuard } from '@/components/shared';
import { useOwnCompany, useUpdateCompanyMutation } from '@/hooks/api/useCompany';
import { usePermissions } from '@/hooks/usePermissions';
import type { Company } from '@/types/api';

// ─── Schema ───────────────────────────────────────────────────────────────────

const optStr = (max: number) => z.string().max(max).optional().or(z.literal(''));

const schema = z.object({
  displayName: z.string().min(1, 'Display name is required').max(120),
  legalName: optStr(200),
  tagline: optStr(300),
  timezone: optStr(100),
  copyrightText: optStr(500),
  disclaimerShort: optStr(500),
  disclaimerLong: optStr(2000),
  logoIconUrl: optStr(500),
  logoFullUrl: optStr(500),

  supportEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  supportPhone: optStr(40),
  supportHours: optStr(200),
  addressLine1: optStr(200),
  addressLine2: optStr(200),
  addressCity: optStr(100),
  addressState: optStr(100),
  addressPostalCode: optStr(20),
  addressCountry: optStr(100),

  bankAccountHolder: optStr(200),
  bankName: optStr(200),
  bankAccountNumber: optStr(60),
  bankSwiftBic: optStr(20),
  bankCountry: optStr(100),
  usdtWalletAddress: optStr(120),
  usdtNetwork: z.enum(['', 'TRC20', 'ERC20', 'BEP20']).optional(),

  webBaseUrl: optStr(300),
  apiBaseUrl: optStr(300),
  helpCenterUrl: optStr(300),
  privacyPolicyUrl: optStr(300),
  termsUrl: optStr(300),
  unsubscribeUrl: optStr(300),
  facebook: optStr(300),
  instagram: optStr(300),
  linkedin: optStr(300),
  x: optStr(300),
  youtube: optStr(300),
  tiktok: optStr(300),
  whatsapp: optStr(300),
  telegram: optStr(300),
});

type FormValues = z.infer<typeof schema>;

const FIELD_KEYS: (keyof FormValues)[] = [
  'displayName', 'legalName', 'tagline', 'timezone', 'copyrightText', 'disclaimerShort', 'disclaimerLong', 'logoIconUrl', 'logoFullUrl',
  'supportEmail', 'supportPhone', 'supportHours',
  'addressLine1', 'addressLine2', 'addressCity', 'addressState', 'addressPostalCode', 'addressCountry',
  'bankAccountHolder', 'bankName', 'bankAccountNumber', 'bankSwiftBic', 'bankCountry', 'usdtWalletAddress', 'usdtNetwork',
  'webBaseUrl', 'apiBaseUrl', 'helpCenterUrl', 'privacyPolicyUrl', 'termsUrl', 'unsubscribeUrl',
  'facebook', 'instagram', 'linkedin', 'x', 'youtube', 'tiktok', 'whatsapp', 'telegram',
];

function toFormValues(c: Company): FormValues {
  const out = {} as Record<string, unknown>;
  for (const key of FIELD_KEYS) out[key] = (c as unknown as Record<string, unknown>)[key] ?? '';
  out.displayName = c.displayName ?? '';
  return out as FormValues;
}

const USDT_NETWORKS = ['TRC20', 'ERC20', 'BEP20'] as const;
const TABS = ['General', 'Contact & Address', 'Payment', 'Web & Social'] as const;

// ─── Sub-components ───────────────────────────────────────────────────────────

function ViewField({ label, value }: { label: string; value?: string | null }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} display="block">
        {label}
      </Typography>
      <Typography variant="body2" mt={0.25} color={value ? 'text.primary' : 'text.disabled'} sx={{ wordBreak: 'break-all' }}>
        {value || '—'}
      </Typography>
    </Box>
  );
}

interface FieldProps {
  name: keyof FormValues;
  label: string;
  control: ReturnType<typeof useForm<FormValues>>['control'];
  editing: boolean;
  errors: ReturnType<typeof useForm<FormValues>>['formState']['errors'];
  viewValue?: string | null;
  multiline?: boolean;
  rows?: number;
  select?: boolean;
  options?: readonly string[];
  xs?: number;
  sm?: number;
}

function F({ name, label, control, editing, errors, viewValue, multiline, rows, select, options, xs = 12, sm = 6 }: FieldProps) {
  return (
    <Grid item xs={xs} sm={sm}>
      {editing ? (
        <Controller
          name={name}
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label={label}
              fullWidth
              size="small"
              select={select}
              multiline={multiline}
              rows={rows}
              error={!!errors[name]}
              helperText={errors[name]?.message as string | undefined}
            >
              {select && [
                <MenuItem key="" value="">—</MenuItem>,
                ...(options ?? []).map((opt) => <MenuItem key={opt} value={opt}>{opt}</MenuItem>),
              ]}
            </TextField>
          )}
        />
      ) : (
        <ViewField label={label} value={viewValue} />
      )}
    </Grid>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyPage() {
  const { canEditCompany } = usePermissions();
  const { data: company, isLoading, error } = useOwnCompany();
  const updateMutation = useUpdateCompanyMutation();
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [tab, setTab] = useState(0);

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: company ? toFormValues(company) : undefined,
  });

  const watched = useWatch({ control });

  const v = (key: keyof FormValues): string | null =>
    editing
      ? (watched[key] as string | null | undefined) ?? null
      : ((company as unknown as Record<string, unknown>)[key] as string | null | undefined) ?? null;

  function startEditing() {
    if (company) reset(toFormValues(company));
    setSaveError(null);
    setEditing(true);
  }

  function cancelEditing() {
    if (company) reset(toFormValues(company));
    setSaveError(null);
    setEditing(false);
  }

  async function onSubmit(values: FormValues) {
    setSaveError(null);
    try {
      await updateMutation.mutateAsync(values as Partial<Company>);
      setEditing(false);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save company settings');
    }
  }

  if (isLoading) {
    return (
      <Box>
        <PageHeader title="My Organization" />
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      </Box>
    );
  }

  if (error || !company) {
    return (
      <Box>
        <PageHeader title="My Organization" />
        <Alert severity="error">Failed to load organization data. Please refresh the page.</Alert>
      </Box>
    );
  }

  const isActive = company.isActive !== false;

  return (
    <Box>
      <PageHeader
        title="My Organization"
        actions={
          editing ? (
            <Stack direction="row" spacing={1}>
              <Button variant="outlined" startIcon={<CloseOutlinedIcon />} onClick={cancelEditing} disabled={updateMutation.isPending}>
                Cancel
              </Button>
              <Button
                variant="contained"
                startIcon={updateMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <SaveOutlinedIcon />}
                onClick={handleSubmit(onSubmit)}
                disabled={updateMutation.isPending || !isDirty}
              >
                {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
              </Button>
            </Stack>
          ) : (
            <PermissionGuard allowed={canEditCompany}>
              <Button variant="outlined" startIcon={<EditOutlinedIcon />} onClick={startEditing}>
                Edit
              </Button>
            </PermissionGuard>
          )
        }
      />

      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

      <Stack spacing={3} sx={{ width: '100%', maxWidth: 1100, mx: 'auto' }}>
        {/* Identity banner */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar src={company.logoIconUrl || undefined} sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 24 }}>
                {!company.logoIconUrl && <DomainOutlinedIcon />}
              </Avatar>
              <Box flex={1}>
                <Typography variant="h6" fontWeight={700}>{company.displayName}</Typography>
                {company.tagline && <Typography variant="body2" color="text.secondary">{company.tagline}</Typography>}
              </Box>
              <Stack spacing={0.5} alignItems="flex-end">
                <Chip label={isActive ? 'Active' : 'Inactive'} color={isActive ? 'success' : 'default'} size="small" />
                <Typography variant="caption" color="text.secondary" fontFamily="monospace">{company.companyKey}</Typography>
              </Stack>
            </Stack>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <Tabs
            value={tab}
            onChange={(_e, val) => setTab(val)}
            variant="scrollable"
            scrollButtons="auto"
            sx={{ borderBottom: 1, borderColor: 'divider', px: 1 }}
          >
            {TABS.map((label) => <Tab key={label} label={label} sx={{ textTransform: 'none', fontWeight: 600 }} />)}
          </Tabs>

          <CardContent>
            {/* ── General */}
            {tab === 0 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}><ViewField label="Organization Key (read-only)" value={company.companyKey} /></Grid>
                <F name="displayName" label="Display Name" control={control} editing={editing} errors={errors} viewValue={v('displayName')} />
                <F name="legalName" label="Legal Name" control={control} editing={editing} errors={errors} viewValue={v('legalName')} />
                <F name="tagline" label="Tagline" control={control} editing={editing} errors={errors} viewValue={v('tagline')} />
                <F name="timezone" label="Timezone" control={control} editing={editing} errors={errors} viewValue={v('timezone')} />
                <F name="logoIconUrl" label="Logo Icon URL" control={control} editing={editing} errors={errors} viewValue={v('logoIconUrl')} />
                <F name="logoFullUrl" label="Logo Full URL" control={control} editing={editing} errors={errors} viewValue={v('logoFullUrl')} />
                {!editing && company.logoFullUrl && (
                  <Grid item xs={12}>
                    <Box component="img" src={company.logoFullUrl} alt="Logo" sx={{ maxWidth: 220, height: 44, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                  </Grid>
                )}
                <F name="copyrightText" label="Copyright Text" control={control} editing={editing} errors={errors} viewValue={v('copyrightText')} xs={12} sm={12} />
                <F name="disclaimerShort" label="Disclaimer (short)" control={control} editing={editing} errors={errors} viewValue={v('disclaimerShort')} xs={12} sm={12} multiline rows={2} />
                <F name="disclaimerLong" label="Disclaimer (long)" control={control} editing={editing} errors={errors} viewValue={v('disclaimerLong')} xs={12} sm={12} multiline rows={4} />
              </Grid>
            )}

            {/* ── Contact & Address */}
            {tab === 1 && (
              <Grid container spacing={2.5}>
                <F name="supportEmail" label="Support Email" control={control} editing={editing} errors={errors} viewValue={v('supportEmail')} />
                <F name="supportPhone" label="Support Phone" control={control} editing={editing} errors={errors} viewValue={v('supportPhone')} />
                <F name="supportHours" label="Support Hours" control={control} editing={editing} errors={errors} viewValue={v('supportHours')} xs={12} sm={12} />
                <F name="addressLine1" label="Address Line 1" control={control} editing={editing} errors={errors} viewValue={v('addressLine1')} xs={12} sm={12} />
                <F name="addressLine2" label="Address Line 2" control={control} editing={editing} errors={errors} viewValue={v('addressLine2')} xs={12} sm={12} />
                <F name="addressCity" label="City" control={control} editing={editing} errors={errors} viewValue={v('addressCity')} />
                <F name="addressState" label="State / Region" control={control} editing={editing} errors={errors} viewValue={v('addressState')} />
                <F name="addressPostalCode" label="Postal Code" control={control} editing={editing} errors={errors} viewValue={v('addressPostalCode')} />
                <F name="addressCountry" label="Country" control={control} editing={editing} errors={errors} viewValue={v('addressCountry')} />
              </Grid>
            )}

            {/* ── Payment */}
            {tab === 2 && (
              <Grid container spacing={2.5}>
                <Grid item xs={12}>
                  <Typography variant="body2" color="text.secondary">
                    Where this organization receives money for what it sells. Leave blank if not applicable — a USDT wallet and its network must be set together.
                  </Typography>
                </Grid>
                <F name="bankAccountHolder" label="Bank Account Holder" control={control} editing={editing} errors={errors} viewValue={v('bankAccountHolder')} />
                <F name="bankName" label="Bank Name" control={control} editing={editing} errors={errors} viewValue={v('bankName')} />
                <F name="bankAccountNumber" label="Account Number / IBAN" control={control} editing={editing} errors={errors} viewValue={v('bankAccountNumber')} />
                <F name="bankSwiftBic" label="SWIFT / BIC" control={control} editing={editing} errors={errors} viewValue={v('bankSwiftBic')} />
                <F name="bankCountry" label="Bank Country" control={control} editing={editing} errors={errors} viewValue={v('bankCountry')} />
                <Grid item xs={12} sm={6} />
                <F name="usdtWalletAddress" label="USDT Wallet Address" control={control} editing={editing} errors={errors} viewValue={v('usdtWalletAddress')} />
                <F name="usdtNetwork" label="USDT Network" control={control} editing={editing} errors={errors} viewValue={v('usdtNetwork')} select options={USDT_NETWORKS} />
              </Grid>
            )}

            {/* ── Web & Social */}
            {tab === 3 && (
              <Grid container spacing={2.5}>
                <F name="webBaseUrl" label="Website" control={control} editing={editing} errors={errors} viewValue={v('webBaseUrl')} />
                <F name="apiBaseUrl" label="API Base URL" control={control} editing={editing} errors={errors} viewValue={v('apiBaseUrl')} />
                <F name="helpCenterUrl" label="Help Center" control={control} editing={editing} errors={errors} viewValue={v('helpCenterUrl')} />
                <F name="privacyPolicyUrl" label="Privacy Policy" control={control} editing={editing} errors={errors} viewValue={v('privacyPolicyUrl')} />
                <F name="termsUrl" label="Terms of Service" control={control} editing={editing} errors={errors} viewValue={v('termsUrl')} />
                <F name="unsubscribeUrl" label="Unsubscribe URL" control={control} editing={editing} errors={errors} viewValue={v('unsubscribeUrl')} />
                <F name="facebook" label="Facebook" control={control} editing={editing} errors={errors} viewValue={v('facebook')} />
                <F name="instagram" label="Instagram" control={control} editing={editing} errors={errors} viewValue={v('instagram')} />
                <F name="linkedin" label="LinkedIn" control={control} editing={editing} errors={errors} viewValue={v('linkedin')} />
                <F name="x" label="X (Twitter)" control={control} editing={editing} errors={errors} viewValue={v('x')} />
                <F name="youtube" label="YouTube" control={control} editing={editing} errors={errors} viewValue={v('youtube')} />
                <F name="tiktok" label="TikTok" control={control} editing={editing} errors={errors} viewValue={v('tiktok')} />
                <F name="whatsapp" label="WhatsApp" control={control} editing={editing} errors={errors} viewValue={v('whatsapp')} />
                <F name="telegram" label="Telegram" control={control} editing={editing} errors={errors} viewValue={v('telegram')} />
              </Grid>
            )}
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
