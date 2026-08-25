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
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import NavigateBeforeOutlinedIcon from '@mui/icons-material/NavigateBeforeOutlined';
import NavigateNextOutlinedIcon from '@mui/icons-material/NavigateNextOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
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
  usePayoutsList,
  usePayoutDetail,
  usePaymentUnits,
} from '@/hooks/api/usePayments';
import { formatAmountMinor } from '@/lib/formatBalance';
import { PAGE_CAPABILITY, PAGE_FEATURE_DISPLAY_NAME } from '@/lib/config/payments-capability-map';
import type {
  PayoutSummary,
  PayoutCanonicalStatus,
  ListPayoutsParams,
} from '@/types/payments';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PayoutCanonicalStatus,
  { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'default' }
> = {
  pending:    { label: 'Pending',    color: 'default' },
  in_transit: { label: 'In Transit', color: 'info'    },
  paid:       { label: 'Paid',       color: 'success' },
  failed:     { label: 'Failed',     color: 'error'   },
  cancelled:  { label: 'Cancelled',  color: 'default' },
  reversed:   { label: 'Reversed',   color: 'warning' },
  unknown:    { label: 'Unknown',    color: 'default' },
};

function PayoutStatusBadge({
  status,
  size = 'small',
}: {
  status: PayoutCanonicalStatus;
  size?: 'small' | 'medium';
}) {
  const config =
    STATUS_CONFIG[status] ?? { label: status, color: 'default' as const };
  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant={config.color === 'default' ? 'outlined' : 'filled'}
    />
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function truncateId(id: string, len = 22): string {
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

// ─── Status filter options ────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '',           label: 'All statuses' },
  { value: 'pending',    label: 'Pending'      },
  { value: 'in_transit', label: 'In Transit'   },
  { value: 'paid',       label: 'Paid'         },
  { value: 'failed',     label: 'Failed'       },
  { value: 'cancelled',  label: 'Cancelled'    },
];

// ─── Payout detail drawer ─────────────────────────────────────────────────────

function PayoutDetailDrawer({
  connectionId,
  payoutId,
  onClose,
}: {
  connectionId: string;
  payoutId: string;
  onClose: () => void;
}) {
  const { data: detail, isLoading, error } = usePayoutDetail(
    connectionId,
    payoutId,
  );

  return (
    <FormDrawer
      open
      onClose={onClose}
      title="Payout Detail"
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
          title="Could not load payout"
          description="The provider API returned an error. Check credentials and try again."
        />
      )}

      {detail && !isLoading && (
        <Stack spacing={2.5}>
          {/* Status */}
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Status
            </Typography>
            <PayoutStatusBadge status={detail.status} size="medium" />
          </Box>

          <Divider />

          {/* Overview */}
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
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Provider
                </Typography>
                <Typography variant="body2">{detail.providerKey}</Typography>
              </Box>
              {detail.automatic !== undefined && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Type
                  </Typography>
                  <Typography variant="body2">
                    {detail.automatic ? 'Automatic' : 'Manual'}
                  </Typography>
                </Box>
              )}
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body2">
                  {formatDateTime(detail.createdAt)}
                </Typography>
              </Box>
              {detail.estimatedArrivalAt && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="body2" color="text.secondary">
                    Estimated Arrival
                  </Typography>
                  <Typography variant="body2">
                    {formatDate(detail.estimatedArrivalAt)}
                  </Typography>
                </Box>
              )}
              {detail.description && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    mb={0.25}
                  >
                    Description
                  </Typography>
                  <Typography variant="body2">{detail.description}</Typography>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Provider IDs */}
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
                  Payout ID
                </Typography>
                <Typography
                  variant="body2"
                  fontFamily="monospace"
                  sx={{ wordBreak: 'break-all' }}
                >
                  {detail.providerPayoutId}
                </Typography>
              </Box>
              {detail.balanceTransactionId && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    mb={0.25}
                  >
                    Balance Transaction
                  </Typography>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    sx={{ wordBreak: 'break-all' }}
                  >
                    {detail.balanceTransactionId}
                  </Typography>
                </Box>
              )}
              {detail.destinationId && (
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                    mb={0.25}
                  >
                    Destination ID
                  </Typography>
                  <Typography
                    variant="body2"
                    fontFamily="monospace"
                    sx={{ wordBreak: 'break-all' }}
                  >
                    {detail.destinationId}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {/* Destination */}
          {(detail.destinationBankName ??
            detail.destinationLast4 ??
            detail.destinationLabel ??
            detail.statementDescriptor ??
            detail.method) && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Destination
                </Typography>
                <Stack spacing={1}>
                  {detail.destinationLabel && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Account
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {detail.destinationLabel}
                      </Typography>
                    </Box>
                  )}
                  {detail.destinationBankName && !detail.destinationLabel && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Bank
                      </Typography>
                      <Typography variant="body2">
                        {detail.destinationBankName}
                      </Typography>
                    </Box>
                  )}
                  {detail.destinationLast4 && !detail.destinationLabel && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Last 4
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        •••• {detail.destinationLast4}
                      </Typography>
                    </Box>
                  )}
                  {detail.method && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Method
                      </Typography>
                      <Typography variant="body2">
                        {detail.method.charAt(0).toUpperCase() +
                          detail.method.slice(1)}
                      </Typography>
                    </Box>
                  )}
                  {detail.statementDescriptor && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Statement Descriptor
                      </Typography>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        sx={{ textAlign: 'right' }}
                      >
                        {detail.statementDescriptor}
                      </Typography>
                    </Box>
                  )}
                  {detail.sourceType && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">
                        Source Type
                      </Typography>
                      <Typography variant="body2">
                        {detail.sourceType}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {/* Failure details */}
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
                  {detail.failureBalanceTransactionId && (
                    <Box>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                        mb={0.25}
                      >
                        Failure Balance Transaction
                      </Typography>
                      <Typography
                        variant="body2"
                        fontFamily="monospace"
                        sx={{ wordBreak: 'break-all' }}
                      >
                        {detail.failureBalanceTransactionId}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {/* Metadata */}
          {detail.metadata && Object.keys(detail.metadata).length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Metadata
                </Typography>
                <Stack spacing={0.75}>
                  {Object.entries(detail.metadata).map(([k, v]) => (
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

export default function PaymentsPayoutsPage() {
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

  const capabilityStatus = getCapabilityStatus(PAGE_CAPABILITY.payouts);
  const capabilityBlocks =
    Boolean(resolvedProviderKey) &&
    Boolean(capabilityStatus) &&
    capabilityStatus !== 'available';

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  // ── Cursor-based pagination ──────────────────────────────────────────────────
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  // ── Drawer ───────────────────────────────────────────────────────────────────
  const [viewPayoutId, setViewPayoutId] = useState<string | null>(null);

  // ── Payment units (provider-driven currency / asset options) ─────────────────
  const { data: unitsData, isLoading: unitsLoading } = usePaymentUnits(
    capabilityBlocks ? null : resolvedConnectionId || null,
  );
  const availableUnits = unitsData?.data ?? [];

  // Reset all state when connection changes — never preserve stale provider data
  useEffect(() => {
    setCursor(undefined);
    setCursorStack([]);
    setViewPayoutId(null);
    setFilterCurrency('');
    setFilterStatus('');
    setSearch('');
    setCreatedFrom('');
    setCreatedTo('');
  }, [resolvedConnectionId]);

  const queryParams = useMemo<ListPayoutsParams>(() => {
    const p: ListPayoutsParams = { limit: 20 };
    if (cursor) p.cursor = cursor;
    if (filterStatus) p.status = filterStatus;
    // Send uppercase code; backend lowercases before Stripe
    if (filterCurrency.trim()) p.currency = filterCurrency.trim().toLowerCase();
    if (createdFrom) p.createdFrom = new Date(createdFrom).toISOString();
    if (createdTo) p.createdTo = new Date(createdTo).toISOString();
    if (search.trim()) p.search = search.trim();
    return p;
  }, [cursor, filterStatus, filterCurrency, createdFrom, createdTo, search]);

  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
    refetch,
  } = usePayoutsList(capabilityBlocks ? null : resolvedConnectionId || null, queryParams);

  const payouts = useMemo(() => listData?.data ?? [], [listData]);
  const hasMore = listData?.hasMore ?? false;
  const nextCursor = listData?.nextCursor;

  const hasActiveFilters = Boolean(
    search || filterStatus || filterCurrency || createdFrom || createdTo,
  );

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilterStatus('');
    setFilterCurrency('');
    setCreatedFrom('');
    setCreatedTo('');
    setCursor(undefined);
    setCursorStack([]);
  }, []);

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

  // ── Table columns ────────────────────────────────────────────────────────────
  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'id',
        headerName: 'Payout',
        flex: 1.5,
        minWidth: 180,
        renderCell: (p) => {
          const row = p.row as PayoutSummary;
          return (
            <Box>
              <Typography
                variant="body2"
                fontFamily="monospace"
                fontSize="0.75rem"
              >
                {truncateId(row.providerPayoutId)}
              </Typography>
              {row.description && (
                <Typography
                  variant="caption"
                  color="text.secondary"
                  display="block"
                >
                  {row.description}
                </Typography>
              )}
            </Box>
          );
        },
      },
      {
        field: 'amountMinor',
        headerName: 'Amount',
        width: 120,
        renderCell: (p) => {
          const row = p.row as PayoutSummary;
          return (
            <Typography variant="body2" fontWeight={600}>
              {formatAmountMinor(row.amountMinor, row.currency)}
            </Typography>
          );
        },
      },
      {
        field: 'destinationLabel',
        headerName: 'Destination',
        flex: 1,
        minWidth: 140,
        renderCell: (p) => {
          const row = p.row as PayoutSummary;
          return (
            <Typography
              variant="body2"
              fontFamily="monospace"
              fontSize="0.75rem"
              color={row.destinationLabel ? 'text.primary' : 'text.disabled'}
            >
              {row.destinationLabel ?? '—'}
            </Typography>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (p) => (
          <PayoutStatusBadge status={(p.row as PayoutSummary).status} />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 110,
        renderCell: (p) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate((p.row as PayoutSummary).createdAt)}
          </Typography>
        ),
      },
      {
        field: 'estimatedArrivalAt',
        headerName: 'Arrival',
        width: 110,
        renderCell: (p) => {
          const row = p.row as PayoutSummary;
          return (
            <Typography
              variant="body2"
              color={
                row.estimatedArrivalAt ? 'text.secondary' : 'text.disabled'
              }
            >
              {row.estimatedArrivalAt
                ? formatDate(row.estimatedArrivalAt)
                : '—'}
            </Typography>
          );
        },
      },
    ],
    [],
  );

  const rowActions = useCallback(
    (row: PayoutSummary) => (
      <RowActions>
        <Tooltip title="View details">
          <IconButton size="small" onClick={() => setViewPayoutId(row.id)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </RowActions>
    ),
    [],
  );

  const mobileCardConfig = useMemo<MobileCardConfig<PayoutSummary>>(
    () => ({
      primaryText: (row) => truncateId(row.providerPayoutId, 24),
      secondaryText: (row) => row.description ?? row.destinationLabel ?? '',
      badge: (row) => <PayoutStatusBadge status={row.status} />,
      fields: [
        {
          field: 'amountMinor',
          label: 'Amount',
          render: (_v, row) =>
            formatAmountMinor(
              (row as PayoutSummary).amountMinor,
              (row as PayoutSummary).currency,
            ),
        },
        {
          field: 'estimatedArrivalAt',
          label: 'Arrival',
          render: (_v, row) =>
            (row as PayoutSummary).estimatedArrivalAt
              ? formatDate((row as PayoutSummary).estimatedArrivalAt!)
              : '—',
        },
      ],
    }),
    [],
  );

  const emptyState = (
    <EmptyState
      icon={SendOutlinedIcon}
      title={
        hasActiveFilters
          ? 'No payouts match your filters'
          : 'No payouts were returned by this provider connection.'
      }
      description={
        hasActiveFilters
          ? 'Try adjusting your search or filters.'
          : 'Payouts from provider balance to your bank account will appear here.'
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
        <PageHeader title="Payouts" />
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
          title="Payouts"
          breadcrumbs={[
            { label: 'Payments', href: '/payments' },
            { label: 'Payouts' },
          ]}
        />
        <EmptyState
          icon={SendOutlinedIcon}
          title="No payment providers configured"
          description="Configure a payment provider credential in the Credentials page to view payouts."
        />
      </Box>
    );
  }

  if (capabilityBlocks && capabilityStatus) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader
          title="Payouts"
          breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Payouts' }]}
        />
        <PaymentsFilter />
        <ProviderFeatureUnavailable
          featureDisplayName={PAGE_FEATURE_DISPLAY_NAME.payouts}
          providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey}
          status={capabilityStatus as 'planned' | 'unsupported'}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Payouts"
        subtitle={pageSubtitle}
        count={
          resolvedConnectionId && !listLoading ? payouts.length : undefined
        }
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: 'Payouts' },
        ]}
        actions={
          resolvedConnectionId ? (
            <Button
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
              Refresh
            </Button>
          ) : undefined
        }
      />

      {/* Filter row: Provider + Connection + page-specific filters */}
      <PaymentsFilter>
        {/* Search */}
        <TextField
          size="small"
          placeholder="Search payouts…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setCursor(undefined);
            setCursorStack([]);
          }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlinedIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 180 } }}
        />

        {/* Status */}
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={filterStatus}
            displayEmpty
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCursor(undefined);
              setCursorStack([]);
            }}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.value === '' ? <em>{o.label}</em> : o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Currency / Asset — provider-driven, reuses usePaymentUnits */}
        <FormControl
          size="small"
          disabled={unitsLoading || !resolvedConnectionId}
          sx={{ minWidth: { xs: '100%', sm: 160 } }}
        >
          <Select
            value={filterCurrency}
            displayEmpty
            onChange={(e) => {
              setFilterCurrency(e.target.value);
              setCursor(undefined);
              setCursorStack([]);
            }}
          >
            <MenuItem value="">
              <em>
                {unitsLoading
                  ? 'Loading…'
                  : !resolvedConnectionId
                    ? 'Select a connection'
                    : 'All currencies / assets'}
              </em>
            </MenuItem>
            {availableUnits.map((u) => (
              <MenuItem key={u.code} value={u.code}>
                {u.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Created from */}
        <TextField
          size="small"
          type="date"
          label="From"
          InputLabelProps={{ shrink: true }}
          value={createdFrom}
          onChange={(e) => {
            setCreatedFrom(e.target.value);
            setCursor(undefined);
            setCursorStack([]);
          }}
          sx={{ width: { xs: '100%', sm: 140 } }}
        />

        {/* Created to */}
        <TextField
          size="small"
          type="date"
          label="To"
          InputLabelProps={{ shrink: true }}
          value={createdTo}
          onChange={(e) => {
            setCreatedTo(e.target.value);
            setCursor(undefined);
            setCursorStack([]);
          }}
          sx={{ width: { xs: '100%', sm: 140 } }}
        />

        {hasActiveFilters && (
          <Button
            size="small"
            variant="text"
            startIcon={<ClearOutlinedIcon fontSize="small" />}
            onClick={clearFilters}
          >
            Clear
          </Button>
        )}
      </PaymentsFilter>

      {/* No connection selected */}
      {!resolvedConnectionId && (
        <EmptyState
          icon={LinkOutlinedIcon}
          title="No connection selected"
          description="Select a provider and connection above to view payouts."
        />
      )}

      {/* Loading */}
      {resolvedConnectionId && listLoading && (
        <Box display="flex" justifyContent="center" pt={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Error */}
      {resolvedConnectionId && listError && !listLoading && (
        <ErrorState
          title={
            (listError as { response?: { status?: number } }).response
              ?.status === 422
              ? 'Payout listing not supported'
              : 'Could not retrieve payouts'
          }
          description={
            (listError as { response?: { status?: number } }).response
              ?.status === 422
              ? 'The configured payment provider does not support payout listing for this connection.'
              : 'The provider API returned an error. Check your credentials and try again.'
          }
          action={
            <Button variant="outlined" onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      )}

      {/* Data table — fixed height, internal scroll, sticky header + pagination */}
      {resolvedConnectionId && !listLoading && !listError && (
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <DataTable<PayoutSummary>
            rows={payouts}
            columns={columns}
            total={payouts.length}
            page={0}
            pageSize={payouts.length || 20}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            rowActions={rowActions}
            mobileCardConfig={mobileCardConfig}
            emptyState={emptyState}
            noRowsLabel="No payouts found."
            getRowId={(row) => row.id}
            tableHeight="max(300px, calc(100vh - 360px))"
          />

          {/* Cursor pagination — sticky at table bottom */}
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

      {/* Detail drawer */}
      {viewPayoutId && resolvedConnectionId && (
        <PayoutDetailDrawer
          connectionId={resolvedConnectionId}
          payoutId={viewPayoutId}
          onClose={() => setViewPayoutId(null)}
        />
      )}
    </Box>
  );
}
