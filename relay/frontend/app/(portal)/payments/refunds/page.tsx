'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import MoneyOffOutlinedIcon from '@mui/icons-material/MoneyOffOutlined';
import NavigateBeforeOutlinedIcon from '@mui/icons-material/NavigateBeforeOutlined';
import NavigateNextOutlinedIcon from '@mui/icons-material/NavigateNextOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import type { GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '@/components/layout';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FormDrawer,
  RowActions,
  type MobileCardConfig,
} from '@/components/shared';
import { PaymentsFilter } from '@/components/domain/payment/PaymentsFilter';
import { ProviderFeatureUnavailable } from '@/components/domain/payment/ProviderFeatureUnavailable';
import {
  usePaymentsContext,
  connectionLabel,
} from '@/providers/PaymentsProvider';
import {
  useRefundsList,
  useRefundDetail,
  useCreateRefundMutation,
  usePaymentUnits,
  useRefundsPageDefinition,
} from '@/hooks/api/usePayments';
import { formatAmountMinor } from '@/lib/formatBalance';
import {
  PAGE_CAPABILITY,
  PAGE_FEATURE_DISPLAY_NAME,
} from '@/lib/config/payments-capability-map';
import type {
  RefundSummary,
  RefundCanonicalStatus,
  RefundCanonicalReason,
  ListRefundsParams,
  CreateRefundInput,
  RefundsPageDefinition,
  RefundFilterDefinition,
  RefundColumnDefinition,
  RefundCreateFieldDefinition,
} from '@/types/payments';
import type { PaymentUnit } from '@/types/payments';

// ─── Status badge ─────────────────────────────────────────────────────────────

const REFUND_STATUS_CONFIG: Record<
  RefundCanonicalStatus,
  { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'default' }
> = {
  succeeded: { label: 'Succeeded', color: 'success' },
  failed: { label: 'Failed', color: 'error' },
  pending: { label: 'Pending', color: 'default' },
  cancelled: { label: 'Cancelled', color: 'default' },
  requires_action: { label: 'Requires Action', color: 'warning' },
  unknown: { label: 'Unknown', color: 'default' },
};

function RefundStatusBadge({
  status,
  size = 'small',
}: {
  status: RefundCanonicalStatus;
  size?: 'small' | 'medium';
}) {
  const config = REFUND_STATUS_CONFIG[status] ?? {
    label: status,
    color: 'default' as const,
  };
  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant={config.color === 'default' ? 'outlined' : 'filled'}
    />
  );
}

// ─── Canonical refund status options for 'refund_statuses' optionsSource ─────

const REFUND_STATUS_OPTIONS: Array<{
  value: RefundCanonicalStatus | '';
  label: string;
}> = [
  { value: '', label: 'All statuses' },
  { value: 'succeeded', label: 'Succeeded' },
  { value: 'failed', label: 'Failed' },
  { value: 'pending', label: 'Pending' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'requires_action', label: 'Requires Action' },
  { value: 'unknown', label: 'Unknown' },
];

// ─── Canonical refund reason options for 'refund_reasons' optionsSource ───────

const REFUND_REASON_OPTIONS: Array<{
  value: RefundCanonicalReason | '';
  label: string;
}> = [
  { value: '', label: 'No reason specified' },
  { value: 'duplicate', label: 'Duplicate' },
  { value: 'fraudulent', label: 'Fraudulent' },
  { value: 'requested_by_customer', label: 'Requested by customer' },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function truncateId(id: string, len = 20): string {
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

function rowField(row: RefundSummary, field: string): unknown {
  return (row as unknown as Record<string, unknown>)[field];
}

function majorToMinor(major: string, currency: string): number {
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
    const exp = formatter.resolvedOptions().minimumFractionDigits ?? 2;
    return Math.round(parseFloat(major) * Math.pow(10, exp));
  } catch {
    return Math.round(parseFloat(major) * 100);
  }
}

// ─── Column renderer (definition-driven) ─────────────────────────────────────

function buildColumnDef(
  col: RefundColumnDefinition,
  onView: (id: string) => void,
  rowActions: RefundsPageDefinition['rowActions'],
): GridColDef {
  const base: Partial<GridColDef> = {
    field: col.key,
    headerName: col.label,
    width: col.width,
    flex: col.flex,
  };

  switch (col.type) {
    case 'identifier':
      return {
        ...base,
        field: col.key,
        minWidth: 160,
        renderCell: (p) => {
          const row = p.row as RefundSummary;
          const primary = col.field
            ? String(rowField(row, col.field) ?? '')
            : row.providerRefundId;
          const secondary = col.secondaryField
            ? String(rowField(row, col.secondaryField) ?? '')
            : undefined;
          return (
            <Box>
              <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                {truncateId(primary)}
              </Typography>
              {secondary && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  fontFamily="monospace"
                  fontSize="0.7rem"
                >
                  {truncateId(secondary, 18)}
                </Typography>
              )}
            </Box>
          );
        },
      } as GridColDef;

    case 'amount':
      return {
        ...base,
        renderCell: (p) => {
          const row = p.row as RefundSummary;
          return (
            <Typography variant="body2" fontWeight={600}>
              {formatAmountMinor(row.amountMinor, row.currency)}
            </Typography>
          );
        },
      } as GridColDef;

    case 'payment_unit':
      return {
        ...base,
        renderCell: (p) => {
          const row = p.row as RefundSummary;
          const val = col.field ? String(rowField(row, col.field) ?? '') : row.currency;
          return (
            <Typography variant="body2" fontFamily="monospace">
              {val.toUpperCase()}
            </Typography>
          );
        },
      } as GridColDef;

    case 'reason':
      return {
        ...base,
        renderCell: (p) => {
          const row = p.row as RefundSummary;
          return (
            <Typography variant="body2" color="text.secondary">
              {row.reason ?? '—'}
            </Typography>
          );
        },
      } as GridColDef;

    case 'status':
      return {
        ...base,
        renderCell: (p) => (
          <RefundStatusBadge status={(p.row as RefundSummary).status} />
        ),
      } as GridColDef;

    case 'date':
      return {
        ...base,
        renderCell: (p) => {
          const row = p.row as RefundSummary;
          const val = col.field ? rowField(row, col.field) : row.createdAt;
          return (
            <Typography variant="body2" color="text.secondary">
              {val ? formatDate(String(val)) : '—'}
            </Typography>
          );
        },
      } as GridColDef;

    case 'text':
      return {
        ...base,
        renderCell: (p) => {
          const row = p.row as RefundSummary;
          const val = col.field ? rowField(row, col.field) : undefined;
          return (
            <Typography variant="body2">{val ? String(val) : '—'}</Typography>
          );
        },
      } as GridColDef;

    case 'actions':
      return {
        field: 'actions',
        headerName: '',
        width: col.width ?? 64,
        sortable: false,
        renderCell: (p) => {
          const row = p.row as RefundSummary;
          return (
            <RowActions>
              {rowActions.map((action) => {
                if (action.type === 'view') {
                  return (
                    <Tooltip key={action.key} title={action.label}>
                      <IconButton
                        size="small"
                        onClick={() => onView(row.id)}
                      >
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  );
                }
                return null;
              })}
            </RowActions>
          );
        },
      } as GridColDef;

    default:
      return { ...base, field: col.key } as GridColDef;
  }
}

// ─── Dynamic filter renderer ──────────────────────────────────────────────────

function DynamicRefundFilters({
  filterDefs,
  filterValues,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
  availableUnits,
  unitsLoading,
  connectionId,
}: {
  filterDefs: RefundFilterDefinition[];
  filterValues: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClearFilters: () => void;
  hasActiveFilters: boolean;
  availableUnits: PaymentUnit[];
  unitsLoading: boolean;
  connectionId: string | null;
}) {
  return (
    <PaymentsFilter>
      {filterDefs.map((f) => {
        const value = filterValues[f.queryParam] ?? '';

        if (f.type === 'search') {
          return (
            <TextField
              key={f.key}
              size="small"
              placeholder={f.placeholder ?? 'Search…'}
              value={value}
              onChange={(e) => onFilterChange(f.queryParam, e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlinedIcon fontSize="small" />
                  </InputAdornment>
                ),
              }}
              sx={{ width: { xs: '100%', sm: 180 } }}
            />
          );
        }

        if (f.type === 'select') {
          if (f.optionsSource === 'refund_statuses') {
            return (
              <FormControl key={f.key} size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={value}
                  displayEmpty
                  onChange={(e) => onFilterChange(f.queryParam, e.target.value)}
                >
                  {REFUND_STATUS_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.value === '' ? <em>{o.label}</em> : o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }

          if (f.optionsSource === 'payment_units') {
            return (
              <FormControl
                key={f.key}
                size="small"
                disabled={unitsLoading || !connectionId}
                sx={{ minWidth: { xs: '100%', sm: 160 } }}
              >
                <Select
                  value={value}
                  displayEmpty
                  onChange={(e) => {
                    onFilterChange(f.queryParam, e.target.value);
                  }}
                >
                  <MenuItem value="">
                    <em>
                      {unitsLoading
                        ? 'Loading…'
                        : !connectionId
                          ? 'Select a connection'
                          : (f.placeholder ?? 'All currencies / assets')}
                    </em>
                  </MenuItem>
                  {availableUnits.map((u) => (
                    <MenuItem key={u.code + (u.network ?? '')} value={u.code}>
                      {u.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }

          return null;
        }

        if (f.type === 'date') {
          return (
            <TextField
              key={f.key}
              size="small"
              type="date"
              label={f.label}
              InputLabelProps={{ shrink: true }}
              value={value}
              onChange={(e) => onFilterChange(f.queryParam, e.target.value)}
              sx={{ width: { xs: '100%', sm: 140 } }}
            />
          );
        }

        return null;
      })}

      {hasActiveFilters && (
        <Button
          size="small"
          variant="text"
          startIcon={<ClearOutlinedIcon fontSize="small" />}
          onClick={onClearFilters}
        >
          Clear
        </Button>
      )}
    </PaymentsFilter>
  );
}

// ─── Dynamic create form ──────────────────────────────────────────────────────

function DynamicCreateRefundDrawer({
  definition,
  connectionId,
  availableUnits,
  onClose,
}: {
  definition: RefundsPageDefinition;
  connectionId: string;
  availableUnits: PaymentUnit[];
  onClose: () => void;
}) {
  const createRefundMutation = useCreateRefundMutation(connectionId);
  const formDef = definition.createForm;

  // Store field values keyed by field.key
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  // Track selected payment unit objects keyed by field.key
  const [selectedUnits, setSelectedUnits] = useState<
    Record<string, PaymentUnit>
  >({});

  const setField = (key: string, value: string) =>
    setFieldValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!formDef) return;

    const providerExtensions: Record<string, unknown> = {};
    let paymentId = '';
    let amountMinor: number | undefined;
    let reason: RefundCanonicalReason | undefined;

    for (const field of formDef.fields) {
      const val = fieldValues[field.key] ?? '';

      if (field.key === 'paymentId' && !field.providerExtension) {
        paymentId = val;
        continue;
      }

      if (field.key === 'amount' && !field.providerExtension) {
        if (val.trim()) {
          const currency =
            fieldValues['currency'] ??
            selectedUnits['currency_id']?.code ??
            'usd';
          amountMinor = majorToMinor(val, currency);
        }
        continue;
      }

      if (field.key === 'reason' && !field.providerExtension) {
        if (val.trim()) reason = val as RefundCanonicalReason;
        continue;
      }

      if (field.providerExtension) {
        if (
          field.type === 'payment_unit' &&
          field.providerMetadataMapping &&
          selectedUnits[field.key]
        ) {
          // Extract values from providerMetadata using the mapping
          const unit = selectedUnits[field.key];
          for (const [srcKey, destKey] of Object.entries(
            field.providerMetadataMapping,
          )) {
            const metaVal = (unit.providerMetadata as Record<string, unknown> | undefined)?.[srcKey];
            if (metaVal !== undefined) {
              providerExtensions[destKey] = metaVal;
            }
          }
        } else if (val.trim()) {
          providerExtensions[field.key] = val;
        }
      }
    }

    const dto: CreateRefundInput = {
      paymentId,
      ...(amountMinor !== undefined ? { amountMinor } : {}),
      ...(reason ? { reason } : {}),
      ...(Object.keys(providerExtensions).length > 0
        ? { providerExtensions }
        : {}),
    };

    createRefundMutation.mutate(dto, { onSuccess: () => onClose() });
  };

  const isFormValid = () => {
    if (!formDef) return false;
    for (const field of formDef.fields) {
      if (!field.required) continue;
      if (field.type === 'payment_unit') {
        if (!selectedUnits[field.key]) return false;
      } else {
        const val = fieldValues[field.key] ?? '';
        if (!val.trim()) return false;
      }
    }
    return true;
  };

  if (!formDef || !formDef.supported) return null;

  return (
    <FormDrawer
      open
      onClose={onClose}
      title={formDef.title}
      actions={
        <Stack direction="row" spacing={1} width="100%">
          <Button variant="outlined" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!isFormValid() || createRefundMutation.isPending}
            fullWidth
          >
            {createRefundMutation.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              formDef.submitLabel
            )}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        {formDef.description && (
          <Typography variant="body2" color="text.secondary">
            {formDef.description}
          </Typography>
        )}

        {formDef.fields.map((field) =>
          renderFormField(
            field,
            fieldValues,
            selectedUnits,
            availableUnits,
            setField,
            (key, unit) =>
              setSelectedUnits((prev) => ({ ...prev, [key]: unit })),
          ),
        )}
      </Stack>
    </FormDrawer>
  );
}

function renderFormField(
  field: RefundCreateFieldDefinition,
  fieldValues: Record<string, string>,
  selectedUnits: Record<string, PaymentUnit>,
  availableUnits: PaymentUnit[],
  setField: (key: string, value: string) => void,
  setUnit: (key: string, unit: PaymentUnit) => void,
) {
  const value = fieldValues[field.key] ?? '';

  switch (field.type) {
    case 'payment_reference':
    case 'text':
      return (
        <TextField
          key={field.key}
          size="small"
          label={field.label}
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => setField(field.key, e.target.value)}
          helperText={field.helpText}
          required={field.required}
          fullWidth
        />
      );

    case 'email':
      return (
        <TextField
          key={field.key}
          size="small"
          label={field.label}
          type="email"
          placeholder={field.placeholder}
          value={value}
          onChange={(e) => setField(field.key, e.target.value)}
          helperText={field.helpText}
          required={field.required}
          fullWidth
        />
      );

    case 'amount':
      return (
        <TextField
          key={field.key}
          size="small"
          label={field.label}
          type="number"
          inputProps={{ step: 'any', min: 0 }}
          placeholder={field.placeholder ?? '0.00'}
          value={value}
          onChange={(e) => setField(field.key, e.target.value)}
          helperText={field.helpText}
          required={field.required}
          fullWidth
        />
      );

    case 'select':
      if (field.optionsSource === 'refund_reasons') {
        return (
          <FormControl key={field.key} size="small" fullWidth>
            <Select
              value={value}
              displayEmpty
              onChange={(e) => setField(field.key, e.target.value)}
            >
              {REFUND_REASON_OPTIONS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.value === '' ? <em>{o.label}</em> : o.label}
                </MenuItem>
              ))}
            </Select>
            {field.helpText && (
              <Typography variant="caption" color="text.secondary" mt={0.5} ml={1.5}>
                {field.helpText}
              </Typography>
            )}
          </FormControl>
        );
      }
      return null;

    case 'payment_unit': {
      const selected = selectedUnits[field.key];
      return (
        <FormControl key={field.key} size="small" fullWidth>
          <Select
            value={selected ? `${selected.code}:${selected.network ?? ''}` : ''}
            displayEmpty
            onChange={(e) => {
              const [code, network] = e.target.value.split(':');
              const unit = availableUnits.find(
                (u) => u.code === code && (u.network ?? '') === (network ?? ''),
              );
              if (unit) setUnit(field.key, unit);
            }}
          >
            <MenuItem value="">
              <em>{field.placeholder ?? 'Select asset'}</em>
            </MenuItem>
            {availableUnits.map((u) => (
              <MenuItem
                key={u.code + ':' + (u.network ?? '')}
                value={u.code + ':' + (u.network ?? '')}
              >
                {u.label}
              </MenuItem>
            ))}
          </Select>
          {field.helpText && (
            <Typography variant="caption" color="text.secondary" mt={0.5} ml={1.5}>
              {field.helpText}
            </Typography>
          )}
        </FormControl>
      );
    }

    default:
      return null;
  }
}

// ─── Refund detail drawer ─────────────────────────────────────────────────────

function RefundDetailDrawer({
  connectionId,
  refundId,
  onClose,
}: {
  connectionId: string;
  refundId: string;
  onClose: () => void;
}) {
  const { data: detail, isLoading, error } = useRefundDetail(
    connectionId,
    refundId,
  );

  return (
    <FormDrawer
      open
      onClose={onClose}
      title="Refund Detail"
      actions={
        <Button variant="outlined" onClick={onClose} fullWidth>
          Close
        </Button>
      }
    >
      {isLoading && (
        <Box display="flex" justifyContent="center" pt={4}>
          <CircularProgress />
        </Box>
      )}

      {error && !isLoading && (
        <ErrorState
          title="Could not load refund"
          description="The provider API returned an error. Check credentials and try again."
        />
      )}

      {detail && !isLoading && (
        <Stack spacing={2.5}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Status
            </Typography>
            <RefundStatusBadge status={detail.status} size="medium" />
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Overview
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Amount
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatAmountMinor(detail.amountMinor, detail.currency)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Currency
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {detail.currency.toUpperCase()}
                </Typography>
              </Box>
              {detail.reason && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Reason
                  </Typography>
                  <Typography variant="body2">{detail.reason}</Typography>
                </Box>
              )}
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {formatDate(detail.createdAt)}
                </Typography>
              </Box>
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Provider IDs
            </Typography>
            <Stack spacing={1}>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mb={0.25}
                >
                  Refund ID
                </Typography>
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  sx={{ wordBreak: 'break-all' }}
                >
                  {detail.providerRefundId}
                </Typography>
              </Box>
              <Box>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                  mb={0.25}
                >
                  Payment ID
                </Typography>
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  sx={{ wordBreak: 'break-all' }}
                >
                  {detail.providerPaymentId}
                </Typography>
              </Box>
              {detail.providerChargeId && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    mb={0.25}
                  >
                    Charge ID
                  </Typography>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    sx={{ wordBreak: 'break-all' }}
                  >
                    {detail.providerChargeId}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {(detail.paymentAmountMinor !== undefined ||
            detail.refundedAmountMinor !== undefined ||
            detail.remainingRefundableAmountMinor !== undefined) && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Payment Amounts
                </Typography>
                <Stack spacing={1}>
                  {detail.paymentAmountMinor !== undefined && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Original
                      </Typography>
                      <Typography variant="body2">
                        {formatAmountMinor(
                          detail.paymentAmountMinor,
                          detail.currency,
                        )}
                      </Typography>
                    </Box>
                  )}
                  {detail.refundedAmountMinor !== undefined && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Total Refunded
                      </Typography>
                      <Typography variant="body2">
                        {formatAmountMinor(
                          detail.refundedAmountMinor,
                          detail.currency,
                        )}
                      </Typography>
                    </Box>
                  )}
                  {detail.remainingRefundableAmountMinor !== undefined && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Remaining Refundable
                      </Typography>
                      <Typography variant="body2">
                        {formatAmountMinor(
                          detail.remainingRefundableAmountMinor,
                          detail.currency,
                        )}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {(detail.failureCode ?? detail.failureMessage) && (
            <>
              <Divider />
              <Box>
                <Typography
                  variant="subtitle2"
                  fontWeight={600}
                  color="error.main"
                  mb={1}
                >
                  Failure Details
                </Typography>
                <Stack spacing={1}>
                  {detail.failureCode && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Code
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {detail.failureCode}
                      </Typography>
                    </Box>
                  )}
                  {detail.failureMessage && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        mb={0.25}
                      >
                        Message
                      </Typography>
                      <Typography variant="body2" color="error.main">
                        {detail.failureMessage}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {detail.receiptNumber && (
            <>
              <Divider />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Receipt Number
                </Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {detail.receiptNumber}
                </Typography>
              </Box>
            </>
          )}

          {detail.providerMetadata &&
            Object.keys(detail.providerMetadata).length > 0 && (
              <>
                <Divider />
                <Box>
                  <Typography variant="subtitle2" fontWeight={600} mb={1}>
                    Metadata
                  </Typography>
                  <Stack spacing={0.75}>
                    {Object.entries(detail.providerMetadata).map(([k, v]) => (
                      <Box
                        key={k}
                        display="flex"
                        justifyContent="space-between"
                        gap={1}
                      >
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          fontFamily="monospace"
                          sx={{ flexShrink: 0 }}
                        >
                          {k}
                        </Typography>
                        <Typography
                          variant="body2"
                          fontFamily="monospace"
                          sx={{ textAlign: 'right', wordBreak: 'break-all' }}
                        >
                          {v}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                </Box>
              </>
            )}
        </Stack>
      )}
    </FormDrawer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsRefundsPage() {
  const {
    connections,
    connectionsLoading,
    connectionsError,
    resolvedConnectionId,
    resolvedProviderKey,
    selectedProvider,
    getCapabilityStatus,
    selectedConnection,
  } = usePaymentsContext();

  const capabilityStatus = getCapabilityStatus(PAGE_CAPABILITY.refunds);
  const capabilityBlocks =
    Boolean(resolvedProviderKey) &&
    Boolean(capabilityStatus) &&
    capabilityStatus !== 'available';

  // ── Refunds page definition ──────────────────────────────────────────────────
  const {
    data: pageDefinition,
    isLoading: definitionLoading,
    error: definitionError,
  } = useRefundsPageDefinition(
    capabilityBlocks ? null : resolvedConnectionId || null,
  );

  // ── Filters state (keyed by queryParam) ─────────────────────────────────────
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});

  // ── Cursor-based pagination ──────────────────────────────────────────────────
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  // ── Drawers ──────────────────────────────────────────────────────────────────
  const [viewRefundId, setViewRefundId] = useState<string | null>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  // ── Payment units (for currency filter + create form payment_unit fields) ───
  const { data: unitsData, isLoading: unitsLoading } = usePaymentUnits(
    capabilityBlocks ? null : resolvedConnectionId || null,
  );
  const availableUnits = unitsData?.data ?? [];

  // Reset all state when connection changes — no stale definitions or drawer state
  useEffect(() => {
    setCursor(undefined);
    setCursorStack([]);
    setViewRefundId(null);
    setFilterValues({});
    setShowCreateDrawer(false);
  }, [resolvedConnectionId]);

  const handleFilterChange = useCallback((key: string, value: string) => {
    setFilterValues((prev) => ({ ...prev, [key]: value }));
    setCursor(undefined);
    setCursorStack([]);
  }, []);

  const clearFilters = useCallback(() => {
    setFilterValues({});
    setCursor(undefined);
    setCursorStack([]);
  }, []);

  const hasActiveFilters = Object.values(filterValues).some(Boolean);

  // Build query params from filter state
  const queryParams = useMemo<ListRefundsParams>(() => {
    const p: ListRefundsParams = { limit: 20 };
    if (cursor) p.cursor = cursor;
    if (filterValues['currency']) p.currency = filterValues['currency'];
    if (filterValues['createdFrom']) p.createdFrom = filterValues['createdFrom'];
    if (filterValues['createdTo']) p.createdTo = filterValues['createdTo'];
    if (filterValues['search']) p.search = filterValues['search'];
    return p;
  }, [cursor, filterValues]);

  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
    refetch,
  } = useRefundsList(
    capabilityBlocks || !pageDefinition?.list.supported
      ? null
      : resolvedConnectionId || null,
    queryParams,
  );

  // Client-side status filter (neither Stripe nor CoinGate supports server-side status filtering)
  const allRefunds = useMemo(() => listData?.data ?? [], [listData]);
  const statusFilter = filterValues['status'] ?? '';
  const refunds = useMemo(
    () =>
      statusFilter
        ? allRefunds.filter((r) => r.status === statusFilter)
        : allRefunds,
    [allRefunds, statusFilter],
  );
  const hasMore = listData?.hasMore ?? false;
  const nextCursor = listData?.nextCursor;

  const handleRefresh = useCallback(() => {
    void refetch();
  }, [refetch]);

  const handleNext = useCallback(() => {
    if (!nextCursor) return;
    setCursorStack((prev) => [...prev, cursor ?? '']);
    setCursor(nextCursor);
  }, [nextCursor, cursor]);

  const handlePrev = useCallback(() => {
    const stack = [...cursorStack];
    const prev = stack.pop();
    setCursorStack(stack);
    setCursor(prev ?? undefined);
  }, [cursorStack]);

  const pageSubtitle = selectedConnection
    ? `Connection: ${connectionLabel(selectedConnection)}`
    : undefined;

  // ── Build columns from definition ────────────────────────────────────────────
  const columns = useMemo<GridColDef[]>(() => {
    if (!pageDefinition) return [];
    return pageDefinition.columns
      .map((col) =>
        buildColumnDef(col, setViewRefundId, pageDefinition.rowActions),
      )
      .filter(Boolean) as GridColDef[];
  }, [pageDefinition]);

  const mobileCardConfig = useMemo<MobileCardConfig<RefundSummary>>(
    () => ({
      primaryText: (row) => truncateId(row.providerRefundId, 24),
      secondaryText: (row) => truncateId(row.providerPaymentId, 24),
      badge: (row) => <RefundStatusBadge status={row.status} />,
      fields: [
        {
          field: 'amountMinor',
          label: 'Amount',
          render: (_v, row) =>
            formatAmountMinor(
              (row as RefundSummary).amountMinor,
              (row as RefundSummary).currency,
            ),
        },
        {
          field: 'createdAt',
          label: 'Created',
          render: (v) => formatDate(String(v)),
        },
      ],
    }),
    [],
  );

  // ── Toolbar actions ──────────────────────────────────────────────────────────
  const showNewRefund = Boolean(
    pageDefinition?.toolbarActions.some((a) => a.type === 'create_refund'),
  );

  // ── Guard states ─────────────────────────────────────────────────────────────

  if (connectionsLoading) {
    return (
      <Box display="flex" justifyContent="center" pt={8}>
        <CircularProgress />
      </Box>
    );
  }

  if (connectionsError) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader title="Refunds" />
        <ErrorState
          title="Could not load payment connections"
          description="There was a problem loading your configured connections. Please try again."
        />
      </Box>
    );
  }

  if (connections.length === 0) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader
          title="Refunds"
          breadcrumbs={[
            { label: 'Payments', href: '/payments' },
            { label: 'Refunds' },
          ]}
        />
        <EmptyState
          icon={MoneyOffOutlinedIcon}
          title="No payment providers configured"
          description="Configure a payment provider credential in the Credentials page to view and create refunds."
        />
      </Box>
    );
  }

  if (capabilityBlocks && capabilityStatus) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader
          title="Refunds"
          breadcrumbs={[
            { label: 'Payments', href: '/payments' },
            { label: 'Refunds' },
          ]}
        />
        <PaymentsFilter />
        <ProviderFeatureUnavailable
          featureDisplayName={PAGE_FEATURE_DISPLAY_NAME.refunds}
          providerDisplayName={
            selectedProvider?.displayName ?? resolvedProviderKey
          }
          status={capabilityStatus as 'planned' | 'unsupported'}
        />
      </Box>
    );
  }

  // Definition loading state — render filter bar without page content
  if (resolvedConnectionId && definitionLoading) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader
          title="Refunds"
          breadcrumbs={[
            { label: 'Payments', href: '/payments' },
            { label: 'Refunds' },
          ]}
        />
        <PaymentsFilter />
        <Box display="flex" justifyContent="center" pt={4}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  // Definition error state
  if (resolvedConnectionId && definitionError) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader title="Refunds" />
        <PaymentsFilter />
        <ErrorState
          title="Could not load refunds configuration"
          description="The provider returned an error while loading the refunds page layout. Check your credentials and try again."
        />
      </Box>
    );
  }

  const emptyState = (
    <EmptyState
      icon={MoneyOffOutlinedIcon}
      title={
        hasActiveFilters
          ? 'No refunds match your filters'
          : pageDefinition?.emptyState.title ?? 'No refunds found'
      }
      description={
        hasActiveFilters
          ? 'Try adjusting your search or filters.'
          : pageDefinition?.emptyState.description ??
            'Refunds processed through the connected provider will appear here.'
      }
      action={
        hasActiveFilters ? (
          <Button variant="outlined" onClick={clearFilters}>
            Clear filters
          </Button>
        ) : undefined
      }
    />
  );

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Refunds"
        subtitle={pageSubtitle}
        count={
          resolvedConnectionId && !listLoading ? refunds.length : undefined
        }
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: 'Refunds' },
        ]}
        actions={
          resolvedConnectionId && pageDefinition ? (
            <Stack direction="row" spacing={1}>
              {/* Render toolbar actions from definition */}
              {pageDefinition.toolbarActions.map((action) => {
                if (action.type === 'refresh') {
                  return (
                    <Button
                      key={action.key}
                      variant="outlined"
                      size="small"
                      startIcon={
                        listLoading ? (
                          <CircularProgress size={14} color="inherit" />
                        ) : (
                          <RefreshOutlinedIcon />
                        )
                      }
                      onClick={handleRefresh}
                      disabled={listLoading}
                    >
                      {action.label}
                    </Button>
                  );
                }
                if (action.type === 'create_refund') {
                  return (
                    <Button
                      key={action.key}
                      variant="contained"
                      size="small"
                      startIcon={<AddOutlinedIcon />}
                      onClick={() => setShowCreateDrawer(true)}
                      disabled={Boolean(action.disabledReason)}
                    >
                      {action.label}
                    </Button>
                  );
                }
                return null;
              })}
            </Stack>
          ) : undefined
        }
      />

      {/* 1. Shared filter: Provider + Connection + definition-driven page filters */}
      {pageDefinition ? (
        <DynamicRefundFilters
          filterDefs={pageDefinition.filters}
          filterValues={filterValues}
          onFilterChange={handleFilterChange}
          onClearFilters={clearFilters}
          hasActiveFilters={hasActiveFilters}
          availableUnits={availableUnits}
          unitsLoading={unitsLoading}
          connectionId={resolvedConnectionId ?? null}
        />
      ) : (
        <PaymentsFilter />
      )}

      {/* 2. No connection selected */}
      {!resolvedConnectionId && (
        <EmptyState
          icon={LinkOutlinedIcon}
          title="No connection selected"
          description="Select a provider and connection above to view refunds."
        />
      )}

      {/* 3. Loading list */}
      {resolvedConnectionId && pageDefinition && listLoading && (
        <Box display="flex" justifyContent="center" pt={4}>
          <CircularProgress />
        </Box>
      )}

      {/* 4. List error */}
      {resolvedConnectionId && listError && !listLoading && (
        <ErrorState
          title={
            (listError as { response?: { status?: number } }).response
              ?.status === 422
              ? 'Refund listing not supported'
              : 'Could not retrieve refunds'
          }
          description={
            (listError as { response?: { status?: number } }).response
              ?.status === 422
              ? 'The configured payment provider does not support refund listing for this connection.'
              : 'The provider API returned an error. Check your credentials and try again.'
          }
          action={
            <Button variant="outlined" onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      )}

      {/* 5. Definition-driven data table */}
      {resolvedConnectionId && pageDefinition && !listLoading && !listError && (
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <DataTable<RefundSummary>
            rows={refunds}
            columns={columns}
            total={refunds.length}
            page={0}
            pageSize={refunds.length || pageDefinition.list.defaultPageSize}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            mobileCardConfig={mobileCardConfig}
            emptyState={emptyState}
            noRowsLabel="No refunds found."
            getRowId={(row) => row.id}
            tableHeight="max(300px, calc(100vh - 380px))"
          />

          {/* Cursor pagination */}
          {(cursorStack.length > 0 || hasMore) && (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'flex-end',
                alignItems: 'center',
                gap: 1,
                px: 2,
                py: 1,
                borderTop: 1,
                borderColor: 'divider',
                bgcolor: 'background.paper',
              }}
            >
              <Button
                size="small"
                variant="outlined"
                startIcon={<NavigateBeforeOutlinedIcon />}
                onClick={handlePrev}
                disabled={cursorStack.length === 0 || listLoading}
              >
                Previous
              </Button>
              <Button
                size="small"
                variant="outlined"
                endIcon={<NavigateNextOutlinedIcon />}
                onClick={handleNext}
                disabled={!hasMore || listLoading}
              >
                Next
              </Button>
            </Box>
          )}
        </Box>
      )}

      {/* 6. Detail drawer */}
      {viewRefundId && resolvedConnectionId && (
        <RefundDetailDrawer
          connectionId={resolvedConnectionId}
          refundId={viewRefundId}
          onClose={() => setViewRefundId(null)}
        />
      )}

      {/* 7. Create refund drawer — only when definition says it's supported */}
      {showCreateDrawer && resolvedConnectionId && pageDefinition && showNewRefund && (
        <DynamicCreateRefundDrawer
          definition={pageDefinition}
          connectionId={resolvedConnectionId}
          availableUnits={availableUnits}
          onClose={() => setShowCreateDrawer(false)}
        />
      )}
    </Box>
  );
}
