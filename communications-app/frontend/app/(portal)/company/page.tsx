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
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import UploadFileOutlinedIcon from '@mui/icons-material/UploadFileOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import SaveOutlinedIcon from '@mui/icons-material/SaveOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DomainOutlinedIcon from '@mui/icons-material/DomainOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import ContactPhoneOutlinedIcon from '@mui/icons-material/ContactPhoneOutlined';
import LocationOnOutlinedIcon from '@mui/icons-material/LocationOnOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import ShareOutlinedIcon from '@mui/icons-material/ShareOutlined';
import GavelOutlinedIcon from '@mui/icons-material/GavelOutlined';
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined';
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
  supportEmail: z.string().email('Invalid email').optional().or(z.literal('')),
  supportPhone: optStr(40),
  supportHours: optStr(200),
  addressLine1: optStr(200),
  addressLine2: optStr(200),
  addressCity: optStr(100),
  addressState: optStr(100),
  addressPostalCode: optStr(20),
  addressCountry: optStr(100),
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
  copyrightText: optStr(500),
  disclaimerShort: optStr(500),
  disclaimerLong: optStr(2000),
  logoIconUrl: optStr(500),
  logoFullUrl: optStr(500),
});

type FormValues = z.infer<typeof schema>;

function toFormValues(c: Company): FormValues {
  return {
    displayName: c.displayName ?? '',
    legalName: c.legalName ?? '',
    tagline: c.tagline ?? '',
    timezone: c.timezone ?? '',
    supportEmail: c.supportEmail ?? '',
    supportPhone: c.supportPhone ?? '',
    supportHours: c.supportHours ?? '',
    addressLine1: c.addressLine1 ?? '',
    addressLine2: c.addressLine2 ?? '',
    addressCity: c.addressCity ?? '',
    addressState: c.addressState ?? '',
    addressPostalCode: c.addressPostalCode ?? '',
    addressCountry: c.addressCountry ?? '',
    webBaseUrl: c.webBaseUrl ?? '',
    apiBaseUrl: c.apiBaseUrl ?? '',
    helpCenterUrl: c.helpCenterUrl ?? '',
    privacyPolicyUrl: c.privacyPolicyUrl ?? '',
    termsUrl: c.termsUrl ?? '',
    unsubscribeUrl: c.unsubscribeUrl ?? '',
    facebook: c.facebook ?? '',
    instagram: c.instagram ?? '',
    linkedin: c.linkedin ?? '',
    x: c.x ?? '',
    youtube: c.youtube ?? '',
    tiktok: c.tiktok ?? '',
    whatsapp: c.whatsapp ?? '',
    telegram: c.telegram ?? '',
    copyrightText: c.copyrightText ?? '',
    disclaimerShort: c.disclaimerShort ?? '',
    disclaimerLong: c.disclaimerLong ?? '',
    logoIconUrl: c.logoIconUrl ?? '',
    logoFullUrl: c.logoFullUrl ?? '',
  };
}

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

function Section({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card variant="outlined">
      <CardHeader
        avatar={<Box color="text.secondary">{icon}</Box>}
        title={<Typography variant="subtitle1" fontWeight={600}>{title}</Typography>}
        sx={{ pb: 1 }}
      />
      <Divider />
      <CardContent>
        <Grid container spacing={2.5}>
          {children}
        </Grid>
      </CardContent>
    </Card>
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
  xs?: number;
  sm?: number;
}

function F({ name, label, control, editing, errors, viewValue, multiline, rows, xs = 12, sm = 6 }: FieldProps) {
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
              multiline={multiline}
              rows={rows}
              error={!!errors[name]}
              helperText={errors[name]?.message as string | undefined}
            />
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
  const [logoIconMode, setLogoIconMode] = useState<'url' | 'file'>('url');
  const [logoFullMode, setLogoFullMode] = useState<'url' | 'file'>('url');

  const { control, handleSubmit, reset, formState: { errors, isDirty } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    values: company ? toFormValues(company) : undefined,
  });

  // Track form values reactively so view fields stay current when not editing.
  const watched = useWatch({ control });

  const v = (key: keyof FormValues): string | null =>
    editing
      ? (watched[key] as string | null | undefined) ?? null
      : ((company as unknown as Record<string, unknown>)[key] as string | null | undefined) ?? null;

  function startEditing() {
    if (company) reset(toFormValues(company));
    setSaveError(null);
    setLogoIconMode('url');
    setLogoFullMode('url');
    setEditing(true);
  }

  function cancelEditing() {
    if (company) reset(toFormValues(company));
    setSaveError(null);
    setLogoIconMode('url');
    setLogoFullMode('url');
    setEditing(false);
  }

  async function onSubmit(values: FormValues) {
    setSaveError(null);
    try {
      await updateMutation.mutateAsync(values as Partial<Company>);
      setLogoIconMode('url');
      setLogoFullMode('url');
      setEditing(false);
    } catch (e: unknown) {
      setSaveError(e instanceof Error ? e.message : 'Failed to save company settings');
    }
  }

  if (isLoading) {
    return (
      <Box>
        <PageHeader title="My Company" />
        <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
      </Box>
    );
  }

  if (error || !company) {
    return (
      <Box>
        <PageHeader title="My Company" />
        <Alert severity="error">Failed to load company data. Please refresh the page.</Alert>
      </Box>
    );
  }

  const isActive = company.isActive !== false;

  return (
    <Box>
      <PageHeader
        title="My Company"
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
                Edit Company
              </Button>
            </PermissionGuard>
          )
        }
      />

      {saveError && <Alert severity="error" sx={{ mb: 2 }}>{saveError}</Alert>}

      <Stack spacing={3} sx={{ width: '100%', maxWidth: 1280, mx: 'auto' }}>
        {/* Identity banner */}
        <Card variant="outlined">
          <CardContent>
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar
                src={company.logoIconUrl || undefined}
                sx={{ width: 56, height: 56, bgcolor: 'primary.main', fontSize: 24 }}
              >
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

        {/* ── Basic Information */}
        <Section title="Basic Information" icon={<BusinessOutlinedIcon />}>
          <Grid item xs={12} sm={6}>
            <ViewField label="Company Key (read-only)" value={company.companyKey} />
          </Grid>
          <F name="displayName" label="Display Name"   control={control} editing={editing} errors={errors} viewValue={v('displayName')} sm={6} />
          <F name="legalName"   label="Legal Name"      control={control} editing={editing} errors={errors} viewValue={v('legalName')}   sm={6} />
          <F name="tagline"     label="Tagline"          control={control} editing={editing} errors={errors} viewValue={v('tagline')}     sm={6} />
          <F name="timezone"    label="Timezone"         control={control} editing={editing} errors={errors} viewValue={v('timezone')}    sm={6} />
        </Section>

        {/* ── Contact */}
        <Section title="Contact" icon={<ContactPhoneOutlinedIcon />}>
          <F name="supportEmail" label="Support Email" control={control} editing={editing} errors={errors} viewValue={v('supportEmail')} sm={6} />
          <F name="supportPhone" label="Support Phone" control={control} editing={editing} errors={errors} viewValue={v('supportPhone')} sm={6} />
          <F name="supportHours" label="Support Hours" control={control} editing={editing} errors={errors} viewValue={v('supportHours')} xs={12} sm={12} />
        </Section>

        {/* ── Address */}
        <Section title="Address" icon={<LocationOnOutlinedIcon />}>
          <F name="addressLine1"      label="Address Line 1"  control={control} editing={editing} errors={errors} viewValue={v('addressLine1')}      xs={12} sm={12} />
          <F name="addressLine2"      label="Address Line 2"  control={control} editing={editing} errors={errors} viewValue={v('addressLine2')}      xs={12} sm={12} />
          <F name="addressCity"       label="City"             control={control} editing={editing} errors={errors} viewValue={v('addressCity')}       sm={6} />
          <F name="addressState"      label="State / Region"   control={control} editing={editing} errors={errors} viewValue={v('addressState')}      sm={6} />
          <F name="addressPostalCode" label="Postal Code"      control={control} editing={editing} errors={errors} viewValue={v('addressPostalCode')} sm={6} />
          <F name="addressCountry"    label="Country"          control={control} editing={editing} errors={errors} viewValue={v('addressCountry')}    sm={6} />
        </Section>

        {/* ── URLs */}
        <Section title="URLs" icon={<LinkOutlinedIcon />}>
          <F name="webBaseUrl"       label="Website"           control={control} editing={editing} errors={errors} viewValue={v('webBaseUrl')}       sm={6} />
          <F name="apiBaseUrl"       label="API Base URL"      control={control} editing={editing} errors={errors} viewValue={v('apiBaseUrl')}       sm={6} />
          <F name="helpCenterUrl"    label="Help Center"       control={control} editing={editing} errors={errors} viewValue={v('helpCenterUrl')}    sm={6} />
          <F name="privacyPolicyUrl" label="Privacy Policy"    control={control} editing={editing} errors={errors} viewValue={v('privacyPolicyUrl')} sm={6} />
          <F name="termsUrl"         label="Terms of Service"  control={control} editing={editing} errors={errors} viewValue={v('termsUrl')}         sm={6} />
          <F name="unsubscribeUrl"   label="Unsubscribe URL"   control={control} editing={editing} errors={errors} viewValue={v('unsubscribeUrl')}   sm={6} />
        </Section>

        {/* ── Social Media */}
        <Section title="Social Media" icon={<ShareOutlinedIcon />}>
          <F name="facebook"  label="Facebook"     control={control} editing={editing} errors={errors} viewValue={v('facebook')}  sm={6} />
          <F name="instagram" label="Instagram"    control={control} editing={editing} errors={errors} viewValue={v('instagram')} sm={6} />
          <F name="linkedin"  label="LinkedIn"     control={control} editing={editing} errors={errors} viewValue={v('linkedin')}  sm={6} />
          <F name="x"         label="X (Twitter)"  control={control} editing={editing} errors={errors} viewValue={v('x')}         sm={6} />
          <F name="youtube"   label="YouTube"      control={control} editing={editing} errors={errors} viewValue={v('youtube')}   sm={6} />
          <F name="tiktok"    label="TikTok"       control={control} editing={editing} errors={errors} viewValue={v('tiktok')}    sm={6} />
          <F name="whatsapp"  label="WhatsApp"     control={control} editing={editing} errors={errors} viewValue={v('whatsapp')}  sm={6} />
          <F name="telegram"  label="Telegram"     control={control} editing={editing} errors={errors} viewValue={v('telegram')}  sm={6} />
        </Section>

        {/* ── Legal */}
        <Section title="Legal" icon={<GavelOutlinedIcon />}>
          <F name="copyrightText"   label="Copyright Text"     control={control} editing={editing} errors={errors} viewValue={v('copyrightText')}   xs={12} sm={12} />
          <F name="disclaimerShort" label="Disclaimer (short)" control={control} editing={editing} errors={errors} viewValue={v('disclaimerShort')} xs={12} sm={12} multiline rows={2} />
          <F name="disclaimerLong"  label="Disclaimer (long)"  control={control} editing={editing} errors={errors} viewValue={v('disclaimerLong')}  xs={12} sm={12} multiline rows={4} />
        </Section>

        {/* ── Logos */}
        <Section title="Logos" icon={<ImageOutlinedIcon />}>

          {/* Logo Icon */}
          <Grid item xs={12} sm={6}>
            {editing ? (
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                    Logo Icon
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={logoIconMode}
                    onChange={(_e, val) => val && setLogoIconMode(val)}
                    sx={{ height: 28 }}
                  >
                    <ToggleButton value="url" sx={{ px: 1.5, fontSize: '0.7rem', textTransform: 'none' }}>URL</ToggleButton>
                    <ToggleButton value="file" sx={{ px: 1.5, fontSize: '0.7rem', textTransform: 'none' }}>File</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                {logoIconMode === 'url' ? (
                  <Controller
                    name="logoIconUrl"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Logo Icon URL" fullWidth size="small" helperText="Square icon (e.g. 64×64 px)" error={!!errors.logoIconUrl} />
                    )}
                  />
                ) : (
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      bgcolor: 'background.default',
                    }}
                  >
                    <UploadFileOutlinedIcon fontSize="large" color="disabled" />
                    <input type="file" accept="image/*" />
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                      File upload will be implemented later.
                    </Typography>
                  </Box>
                )}
              </Stack>
            ) : (
              <Stack spacing={1}>
                <ViewField label="Logo Icon URL" value={company.logoIconUrl} />
                {company.logoIconUrl && (
                  <Box component="img" src={company.logoIconUrl} alt="Logo icon" sx={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                )}
              </Stack>
            )}
          </Grid>

          {/* Logo Full */}
          <Grid item xs={12} sm={6}>
            {editing ? (
              <Stack spacing={1.5}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5}>
                    Logo Full
                  </Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={logoFullMode}
                    onChange={(_e, val) => val && setLogoFullMode(val)}
                    sx={{ height: 28 }}
                  >
                    <ToggleButton value="url" sx={{ px: 1.5, fontSize: '0.7rem', textTransform: 'none' }}>URL</ToggleButton>
                    <ToggleButton value="file" sx={{ px: 1.5, fontSize: '0.7rem', textTransform: 'none' }}>File</ToggleButton>
                  </ToggleButtonGroup>
                </Stack>
                {logoFullMode === 'url' ? (
                  <Controller
                    name="logoFullUrl"
                    control={control}
                    render={({ field }) => (
                      <TextField {...field} label="Logo Full URL" fullWidth size="small" helperText="Full horizontal logo" error={!!errors.logoFullUrl} />
                    )}
                  />
                ) : (
                  <Box
                    sx={{
                      border: '2px dashed',
                      borderColor: 'divider',
                      borderRadius: 1,
                      p: 2,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 1,
                      bgcolor: 'background.default',
                    }}
                  >
                    <UploadFileOutlinedIcon fontSize="large" color="disabled" />
                    <input type="file" accept="image/*" />
                    <Typography variant="caption" color="text.secondary" textAlign="center">
                      File upload will be implemented later.
                    </Typography>
                  </Box>
                )}
              </Stack>
            ) : (
              <Stack spacing={1}>
                <ViewField label="Logo Full URL" value={company.logoFullUrl} />
                {company.logoFullUrl && (
                  <Box component="img" src={company.logoFullUrl} alt="Logo full" sx={{ maxWidth: 200, height: 40, objectFit: 'contain', borderRadius: 1, border: '1px solid', borderColor: 'divider' }} />
                )}
              </Stack>
            )}
          </Grid>

        </Section>
      </Stack>
    </Box>
  );
}
