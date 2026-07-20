'use client';

import React, { useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Alert               from '@mui/material/Alert';
import ApartmentOutlinedIcon   from '@mui/icons-material/ApartmentOutlined';
import AttachMoneyOutlinedIcon from '@mui/icons-material/AttachMoneyOutlined';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import InfoOutlinedIcon        from '@mui/icons-material/InfoOutlined';
import Box               from '@mui/material/Box';
import Button            from '@mui/material/Button';
import Card              from '@mui/material/Card';
import CardContent       from '@mui/material/CardContent';
import CardHeader        from '@mui/material/CardHeader';
import Chip              from '@mui/material/Chip';
import CircularProgress  from '@mui/material/CircularProgress';
import Divider           from '@mui/material/Divider';
import Grid              from '@mui/material/Grid';
import MenuItem          from '@mui/material/MenuItem';
import Stack             from '@mui/material/Stack';
import TextField         from '@mui/material/TextField';
import Typography        from '@mui/material/Typography';

import { PageHeader } from '@/components/layout';
import { useOwnCompany, useUpdateCompany } from '@/hooks/api/useCompanies';
import { useAuthStore } from '@/stores/auth.store';
import {
  updateCompanySchema,
  CURRENCY_OPTIONS,
  type UpdateCompanyFormData,
} from '@/lib/schemas/company.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_CURRENCIES = new Set(CURRENCY_OPTIONS.map((o) => o.value));

function safeCurrency(value: string | null | undefined): string {
  return value && VALID_CURRENCIES.has(value) ? value : 'AUD';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyBusinessPage() {
  const { data: company, isLoading, isError } = useOwnCompany();
  const updateMutation = useUpdateCompany();
  const role = useAuthStore((s) => s.role);

  const canEdit = role === 'platform_admin' || role === 'business_owner';

  // Always provide concrete defaultValues so every MUI controlled field starts
  // with a defined value — this prevents the uncontrolled→controlled warning.
  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<UpdateCompanyFormData>({
    resolver: zodResolver(updateCompanySchema),
    defaultValues: {
      businessName:   '',
      abn:            '',
      depositAccount: { bsb: '', accountNumber: '' },
      defaultCurrency: 'AUD',
    },
  });

  // Populate the form once the API response arrives.
  // Normalises null/undefined values to safe string defaults so MUI never
  // receives undefined. Called with reset() so the form is marked pristine
  // and isDirty reflects only user edits made after the data loads.
  useEffect(() => {
    if (!company) return;
    reset({
      businessName:    company.businessName ?? '',
      abn:             company.abn ?? '',
      depositAccount: {
        bsb:           company.depositAccount?.bsb ?? '',
        accountNumber: company.depositAccount?.accountNumber ?? '',
      },
      defaultCurrency: safeCurrency(company.defaultCurrency),
    });
  }, [company, reset]);

  async function onSubmit(values: UpdateCompanyFormData) {
    try {
      // Build an explicit payload — never send id, businessKey, isActive,
      // createdAt, updatedAt or other server-managed fields.
      await updateMutation.mutateAsync({
        businessName:    values.businessName,
        abn:             values.abn || undefined,
        depositAccount: {
          bsb:           values.depositAccount?.bsb || undefined,
          accountNumber: values.depositAccount?.accountNumber || undefined,
        },
        defaultCurrency: values.defaultCurrency,
      });
    } catch {
      // Error is handled by useUpdateCompany's onError (snack notification).
      // Catch here prevents an unhandled-rejection in development consoles.
    }
  }

  // ── Loading / error states ───────────────────────────────────────────────

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
        <CircularProgress />
      </Box>
    );
  }

  if (isError || !company) {
    return (
      <Box>
        <PageHeader title="My Business" />
        <Alert severity="error">Could not load business data. Please try again.</Alert>
      </Box>
    );
  }

  // ── Form ────────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader title="My Business" />

      <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', pb: 4 }}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <Stack spacing={3}>

            {/* ── Section 1: Business Information ─────────────────────────── */}
            <Card variant="outlined">
              <CardHeader
                avatar={<ApartmentOutlinedIcon color="action" />}
                title={<Typography variant="subtitle1" fontWeight={600}>Business Information</Typography>}
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="businessName"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Business Name"
                          fullWidth
                          size="small"
                          required
                          disabled={!canEdit}
                          error={!!errors.businessName}
                          helperText={errors.businessName?.message}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      label="Business Key"
                      value={company.businessKey}
                      fullWidth
                      size="small"
                      disabled
                      helperText="System-generated identifier. Cannot be changed."
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* ── Section 2: Business Details ────────────────────────────── */}
            <Card variant="outlined">
              <CardHeader
                avatar={<AttachMoneyOutlinedIcon color="action" />}
                title={<Typography variant="subtitle1" fontWeight={600}>Business Details</Typography>}
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="abn"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="ABN"
                          fullWidth
                          size="small"
                          disabled={!canEdit}
                          placeholder="12345678901"
                          inputProps={{ maxLength: 11 }}
                          error={!!errors.abn}
                          helperText={errors.abn?.message ?? '11 digits — Australian Business Number'}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <Controller
                      name="defaultCurrency"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          select
                          label="Default Currency"
                          fullWidth
                          size="small"
                          required
                          disabled={!canEdit}
                          error={!!errors.defaultCurrency}
                          helperText={errors.defaultCurrency?.message}
                        >
                          {CURRENCY_OPTIONS.map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* ── Section 3: Deposit Account ─────────────────────────────── */}
            <Card variant="outlined">
              <CardHeader
                avatar={<AccountBalanceOutlinedIcon color="action" />}
                title={<Typography variant="subtitle1" fontWeight={600}>Deposit Account</Typography>}
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent>
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={4}>
                    <Controller
                      name="depositAccount.bsb"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="BSB"
                          fullWidth
                          size="small"
                          disabled={!canEdit}
                          placeholder="062000"
                          inputProps={{ maxLength: 6 }}
                          error={!!errors.depositAccount?.bsb}
                          helperText={errors.depositAccount?.bsb?.message ?? '6 digits'}
                        />
                      )}
                    />
                  </Grid>

                  <Grid item xs={12} sm={8}>
                    <Controller
                      name="depositAccount.accountNumber"
                      control={control}
                      render={({ field }) => (
                        <TextField
                          {...field}
                          label="Account Number"
                          fullWidth
                          size="small"
                          disabled={!canEdit}
                          placeholder="12345678"
                          inputProps={{ maxLength: 20 }}
                          error={!!errors.depositAccount?.accountNumber}
                          helperText={errors.depositAccount?.accountNumber?.message}
                        />
                      )}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* ── Section 4: Status (read-only) ──────────────────────────── */}
            <Card variant="outlined">
              <CardHeader
                avatar={<InfoOutlinedIcon color="action" />}
                title={<Typography variant="subtitle1" fontWeight={600}>Status</Typography>}
                sx={{ pb: 1 }}
              />
              <Divider />
              <CardContent>
                <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
                  <Chip
                    size="small"
                    label={company.isActive ? 'Active' : 'Inactive'}
                    color={company.isActive ? 'success' : 'default'}
                    variant="outlined"
                  />
                  <Typography variant="body2" color="text.secondary">
                    {company.isActive
                      ? 'This business is active and can log in and send notifications.'
                      : 'Inactive businesses cannot log in or send notifications.'}
                  </Typography>
                </Box>
              </CardContent>
            </Card>

            {/* ── Actions ────────────────────────────────────────────────── */}
            {canEdit && (
              <Box display="flex" justifyContent="flex-end">
                <Button
                  type="submit"
                  variant="contained"
                  disabled={updateMutation.isPending || !isDirty}
                  startIcon={
                    updateMutation.isPending
                      ? <CircularProgress size={16} color="inherit" />
                      : null
                  }
                >
                  {updateMutation.isPending ? 'Saving…' : 'Save Changes'}
                </Button>
              </Box>
            )}

          </Stack>
        </form>
      </Box>
    </Box>
  );
}
