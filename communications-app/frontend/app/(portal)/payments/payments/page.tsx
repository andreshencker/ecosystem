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
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
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
import { usePaymentsContext, connectionLabel } from '@/providers/PaymentsProvider';
import { usePaymentsList, usePaymentDetail, usePaymentUnits, usePaymentBalance } from '@/hooks/api/usePayments';
import { PAGE_CAPABILITY, PAGE_FEATURE_DISPLAY_NAME } from '@/lib/config/payments-capability-map';
import { formatAmountMinor } from '@/lib/formatBalance';
import type {
  PaymentSummary,
  PaymentCanonicalStatus,
  ListPaymentsParams,
  PaymentBalanceLine,
} from '@/types/payments';

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PaymentCanonicalStatus,
  { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'default' }
> = {
  succeeded:             { label: 'Succeeded',             color: 'success'  },
  failed:                { label: 'Failed',                color: 'error'    },
  processing:            { label: 'Processing',            color: 'info'     },
  pending:               { label: 'Pending',               color: 'default'  },
  requires_action:       { label: 'Requires Action',       color: 'warning'  },
  requires_confirmation: { label: 'Requires Confirmation', color: 'warning'  },
  requires_capture:      { label: 'Requires Capture',      color: 'warning'  },
  cancelled:             { label: 'Cancelled',             color: 'default'  },
  expired:               { label: 'Expired',               color: 'default'  },
  refunded:              { label: 'Refunded',              color: 'info'     },
  partially_refunded:    { label: 'Partially Refunded',    color: 'info'     },
};

function PaymentStatusBadge({
  status,
  size = 'small',
}: {
  status: PaymentCanonicalStatus;
  size?: 'small' | 'medium';
}) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'default' as const };
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

function truncateId(id: string, len = 20): string {
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

// ─── Payment detail drawer ────────────────────────────────────────────────────

function PaymentDetailDrawer({
  connectionId,
  paymentId,
  onClose,
}: {
  connectionId: string;
  paymentId: string;
  onClose: () => void;
}) {
  const { data: detail, isLoading, error } = usePaymentDetail(
    connectionId,
    paymentId,
  );

  return (
    <FormDrawer
      open
      onClose={onClose}
      title="Payment Detail"
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
          title="Could not load payment"
          description="The provider API returned an error. Check credentials and try again."
        />
      )}

      {detail && !isLoading && (
        <Stack spacing={2.5}>
          {/* Status */}
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Status
            </Typography>
            <PaymentStatusBadge status={detail.status} size="medium" />
          </Box>

          <Divider />

          {/* Overview */}
          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>
              Overview
            </Typography>
            <Stack spacing={1}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Amount</Typography>
                <Typography variant="body2" fontWeight={600}>
                  {formatAmountMinor(detail.amountMinor, detail.currency)}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Currency</Typography>
                <Typography variant="body2" fontFamily="monospace">
                  {detail.currency.toUpperCase()}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Provider</Typography>
                <Typography variant="body2">{detail.providerKey}</Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Created</Typography>
                <Typography variant="body2">{formatDate(detail.createdAt)}</Typography>
              </Box>
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
                <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
                  Payment ID
                </Typography>
                <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                  {detail.providerPaymentId}
                </Typography>
              </Box>
              {detail.latestChargeId && (
                <Box>
                  <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
                    Charge ID
                  </Typography>
                  <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
                    {detail.latestChargeId}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          {/* Payment Method */}
          {(detail.paymentMethodType ?? detail.paymentMethodLabel) && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Payment Method
                </Typography>
                <Stack spacing={1}>
                  {detail.paymentMethodType && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Type</Typography>
                      <Typography variant="body2">{detail.paymentMethodType}</Typography>
                    </Box>
                  )}
                  {detail.paymentMethodLabel && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Card</Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {detail.paymentMethodLabel}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {/* Amounts */}
          {(detail.amountReceivedMinor !== undefined ||
            detail.amountCapturableMinor !== undefined ||
            detail.amountRefundedMinor !== undefined) && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>
                  Amounts
                </Typography>
                <Stack spacing={1}>
                  {detail.amountReceivedMinor !== undefined && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Received</Typography>
                      <Typography variant="body2">
                        {formatAmountMinor(detail.amountReceivedMinor, detail.currency)}
                      </Typography>
                    </Box>
                  )}
                  {detail.amountCapturableMinor !== undefined && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Capturable</Typography>
                      <Typography variant="body2">
                        {formatAmountMinor(detail.amountCapturableMinor, detail.currency)}
                      </Typography>
                    </Box>
                  )}
                  {detail.amountRefundedMinor !== undefined && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Refunded</Typography>
                      <Typography variant="body2">
                        {formatAmountMinor(detail.amountRefundedMinor, detail.currency)}
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {/* Failure details */}
          {(detail.failureCode ?? detail.declineCode ?? detail.failureMessage) && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} color="error.main" mb={1}>
                  Failure Details
                </Typography>
                <Stack spacing={1}>
                  {detail.failureCode && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Code</Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {detail.failureCode}
                      </Typography>
                    </Box>
                  )}
                  {detail.declineCode && (
                    <Box display="flex" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">Decline Code</Typography>
                      <Typography variant="body2" fontFamily="monospace">
                        {detail.declineCode}
                      </Typography>
                    </Box>
                  )}
                  {detail.failureMessage && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
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

          {/* Description */}
          {detail.description && (
            <>
              <Divider />
              <Box>
                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                  Description
                </Typography>
                <Typography variant="body2">{detail.description}</Typography>
              </Box>
            </>
          )}

          {/* Provider Metadata */}
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
                      <Box key={k} display="flex" justifyContent="space-between" gap={1}>
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

          {/* Receipt URL */}
          {detail.receiptUrl && (
            <>
              <Divider />
              <Box>
                <Button
                  variant="outlined"
                  size="small"
                  fullWidth
                  href={detail.receiptUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View Receipt
                </Button>
              </Box>
            </>
          )}
        </Stack>
      )}
    </FormDrawer>
  );
}

// ─── Summary cards ────────────────────────────────────────────────────────────

function sumLines(lines: PaymentBalanceLine[]): number {
  return lines.reduce((acc, l) => acc + l.amountMinor, 0);
}

function primaryCurrency(lines: PaymentBalanceLine[]): string {
  return lines[0]?.currency ?? '';
}

interface SummaryCardProps {
  label: string;
  /** Primary value — large bold number or amount. */
  primary: React.ReactNode;
  /** Smaller descriptive text rendered below the primary value. */
  secondary?: string;
  loading?: boolean;
}

function SummaryCard({ label, primary, secondary, loading }: SummaryCardProps) {
  return (
    <Box
      sx={{
        flex: '1 1 160px',
        minWidth: 160,
        p: 2,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        bgcolor: 'background.paper',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={500} mb={0.5}>
        {label}
      </Typography>

      {loading ? (
        <Box flex={1} display="flex" alignItems="center">
          <CircularProgress size={18} />
        </Box>
      ) : (
        <Box flex={1}>{primary}</Box>
      )}

      {!loading && secondary && (
        <Typography variant="body2" color="text.secondary" mt={0.5} noWrap>
          {secondary}
        </Typography>
      )}
    </Box>
  );
}

interface PaymentSummaryCardsProps {
  connectionId: string | null | undefined;
  payments: PaymentSummary[];
}

function PaymentSummaryCards({ connectionId, payments }: PaymentSummaryCardsProps) {
  const { data: balance, isLoading: balanceLoading, error: balanceError } = usePaymentBalance(
    connectionId ?? null,
  );

  const is422 =
    (balanceError as { response?: { status?: number } } | null)?.response?.status === 422;
  const balanceUnavailable = !connectionId || Boolean(balanceError);

  const availableTotal = balance ? sumLines(balance.available) : 0;
  const pendingTotal   = balance ? sumLines(balance.pending)   : 0;
  const balanceCurrency = balance
    ? primaryCurrency(balance.available) || primaryCurrency(balance.pending)
    : '';

  // Count and sum amounts from the currently loaded payment page.
  const successPayments = payments.filter((p) => p.status === 'succeeded');
  const failedPayments  = payments.filter((p) => p.status === 'failed');
  const successCount    = successPayments.length;
  const failedCount     = failedPayments.length;
  const payCurrency     = payments[0]?.currency ?? '';
  const successAmount   = successPayments.reduce((s, p) => s + p.amountMinor, 0);
  const failedAmount    = failedPayments.reduce((s, p) => s + p.amountMinor, 0);

  const unavailableLabel = is422 ? 'Not supported' : 'Unavailable';

  const unavailableNode = (
    <Typography variant="body2" color="text.disabled" fontStyle="italic">
      {unavailableLabel}
    </Typography>
  );

  const noConnectionNode = (
    <Typography variant="h6" fontWeight={700} color="text.disabled">
      —
    </Typography>
  );

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2, alignItems: 'stretch' }}>
      {/* Available Balance */}
      <SummaryCard
        label="Available Balance"
        loading={balanceLoading}
        primary={
          balanceUnavailable ? unavailableNode : (
            <Typography variant="h6" fontWeight={700} color="success.main" noWrap>
              {formatAmountMinor(availableTotal, balanceCurrency)}
            </Typography>
          )
        }
        secondary={!balanceUnavailable ? 'Current available funds' : undefined}
      />

      {/* Pending Balance */}
      <SummaryCard
        label="Pending Balance"
        loading={balanceLoading}
        primary={
          balanceUnavailable ? unavailableNode : (
            <Typography variant="h6" fontWeight={700} color="warning.main" noWrap>
              {formatAmountMinor(pendingTotal, balanceCurrency)}
            </Typography>
          )
        }
        secondary={!balanceUnavailable ? 'Current pending balance' : undefined}
      />

      {/* Successful Payments */}
      <SummaryCard
        label="Successful Payments"
        primary={
          !connectionId ? noConnectionNode : (
            <Typography
              variant="h6"
              fontWeight={700}
              color={successCount > 0 ? 'success.main' : 'text.primary'}
            >
              {successCount}
            </Typography>
          )
        }
        secondary={
          connectionId && successCount > 0 && payCurrency
            ? `${formatAmountMinor(successAmount, payCurrency)} processed`
            : connectionId
            ? 'payments on this page'
            : undefined
        }
      />

      {/* Failed Payments */}
      <SummaryCard
        label="Failed Payments"
        primary={
          !connectionId ? noConnectionNode : (
            <Typography
              variant="h6"
              fontWeight={700}
              color={failedCount > 0 ? 'error.main' : 'text.primary'}
            >
              {failedCount}
            </Typography>
          )
        }
        secondary={
          connectionId && failedCount > 0 && payCurrency
            ? `${formatAmountMinor(failedAmount, payCurrency)} failed`
            : connectionId
            ? 'payments on this page'
            : undefined
        }
      />
    </Box>
  );
}

// ─── Status filter options ────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: Array<{ value: PaymentCanonicalStatus | ''; label: string }> = [
  { value: '',                    label: 'All statuses'          },
  { value: 'succeeded',          label: 'Succeeded'             },
  { value: 'failed',             label: 'Failed'                },
  { value: 'processing',         label: 'Processing'            },
  { value: 'pending',            label: 'Pending'               },
  { value: 'requires_action',    label: 'Requires Action'       },
  { value: 'requires_confirmation', label: 'Requires Confirmation' },
  { value: 'requires_capture',   label: 'Requires Capture'      },
  { value: 'cancelled',          label: 'Cancelled'             },
  { value: 'expired',            label: 'Expired'               },
  { value: 'refunded',           label: 'Refunded'              },
  { value: 'partially_refunded', label: 'Partially Refunded'    },
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPaymentsPage() {
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

  const capabilityStatus = getCapabilityStatus(PAGE_CAPABILITY.payments);
  const capabilityBlocks =
    Boolean(resolvedProviderKey) &&
    Boolean(capabilityStatus) &&
    capabilityStatus !== 'available';

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<PaymentCanonicalStatus | ''>('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  // ── Cursor-based pagination ──────────────────────────────────────────────────
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  // ── Drawer ───────────────────────────────────────────────────────────────────
  const [viewPaymentId, setViewPaymentId] = useState<string | null>(null);

  // ── Payment units (provider-driven currency / asset options) ────────────────
  const {
    data: unitsData,
    isLoading: unitsLoading,
  } = usePaymentUnits(capabilityBlocks ? null : resolvedConnectionId || null);
  const availableUnits = unitsData?.data ?? [];

  // Reset pagination + drawer when connection changes; also clear the selected unit
  // so stale options from the previous connection are never preserved.
  useEffect(() => {
    setCursor(undefined);
    setCursorStack([]);
    setViewPaymentId(null);
    setFilterCurrency('');
  }, [resolvedConnectionId]);

  const queryParams = useMemo<ListPaymentsParams>(() => {
    const p: ListPaymentsParams = { limit: 20 };
    if (cursor) p.cursor = cursor;
    if (filterStatus) p.status = filterStatus;
    if (filterCurrency.trim()) p.currency = filterCurrency.trim();
    if (createdFrom) p.createdFrom = createdFrom;
    if (createdTo) p.createdTo = createdTo;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [cursor, filterStatus, filterCurrency, createdFrom, createdTo, search]);

  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
    refetch,
  } = usePaymentsList(capabilityBlocks ? null : resolvedConnectionId || null, queryParams);

  const payments = useMemo(() => listData?.data ?? [], [listData]);
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
        headerName: 'Payment',
        flex: 1.5,
        minWidth: 160,
        renderCell: (p) => {
          const row = p.row as PaymentSummary;
          return (
            <Box>
              <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                {truncateId(row.providerPaymentId)}
              </Typography>
              {row.description && (
                <Typography variant="caption" color="text.secondary" display="block">
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
          const row = p.row as PaymentSummary;
          return (
            <Typography variant="body2" fontWeight={600}>
              {formatAmountMinor(row.amountMinor, row.currency)}
            </Typography>
          );
        },
      },
      {
        field: 'paymentMethodLabel',
        headerName: 'Method',
        width: 150,
        renderCell: (p) => {
          const row = p.row as PaymentSummary;
          return (
            <Typography variant="body2">
              {row.paymentMethodLabel ?? row.paymentMethodType ?? '—'}
            </Typography>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 160,
        renderCell: (p) => (
          <PaymentStatusBadge status={(p.row as PaymentSummary).status} />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 120,
        renderCell: (p) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate((p.row as PaymentSummary).createdAt)}
          </Typography>
        ),
      },
    ],
    [],
  );

  const rowActions = useCallback(
    (row: PaymentSummary) => (
      <RowActions>
        <Tooltip title="View details">
          <IconButton size="small" onClick={() => setViewPaymentId(row.id)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </RowActions>
    ),
    [],
  );

  const mobileCardConfig = useMemo<MobileCardConfig<PaymentSummary>>(
    () => ({
      primaryText: (row) => truncateId(row.providerPaymentId, 24),
      secondaryText: (row) => row.description ?? row.paymentMethodLabel ?? '',
      badge: (row) => <PaymentStatusBadge status={row.status} />,
      fields: [
        {
          field: 'amountMinor',
          label: 'Amount',
          render: (_v, row) =>
            formatAmountMinor(
              (row as PaymentSummary).amountMinor,
              (row as PaymentSummary).currency,
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

  const emptyState = (
    <EmptyState
      icon={PaymentsOutlinedIcon}
      title={hasActiveFilters ? 'No payments match your filters' : 'No payments found'}
      description={
        hasActiveFilters
          ? 'Try adjusting your search or filters.'
          : 'Payments from the connected provider will appear here.'
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
        <PageHeader title="Payments" />
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
          title="Payments"
          breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Payments' }]}
        />
        <EmptyState
          icon={PaymentsOutlinedIcon}
          title="No payment providers configured"
          description="Configure a payment provider credential in the Credentials page to view payments."
        />
      </Box>
    );
  }

  if (capabilityBlocks && capabilityStatus) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader
          title="Payments"
          breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Payments' }]}
        />
        <PaymentsFilter />
        <ProviderFeatureUnavailable
          featureDisplayName={PAGE_FEATURE_DISPLAY_NAME.payments}
          providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey}
          status={capabilityStatus as 'planned' | 'unsupported'}
        />
      </Box>
    );
  }

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Payments"
        subtitle={pageSubtitle}
        count={
          resolvedConnectionId && !listLoading ? payments.length : undefined
        }
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: 'Payments' },
        ]}
      />

      {/* 1. Provider + Connection selectors */}
      <PaymentsFilter />

      {/* 2. Summary cards — balance (provider) + counts (current page data) */}
      <PaymentSummaryCards connectionId={capabilityBlocks ? null : resolvedConnectionId} payments={payments} />

      {/* 3. Page-specific filters: Search · Status · Currency · Dates · Refresh · Clear */}
      <Box
        sx={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: 1,
          alignItems: 'center',
          mb: 2,
        }}
      >
        {/* Search */}
        <TextField
          size="small"
          placeholder="Search payments…"
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
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <Select
            value={filterStatus}
            displayEmpty
            onChange={(e) => {
              setFilterStatus(e.target.value as PaymentCanonicalStatus | '');
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

        {/* Currency / Asset — options driven by the selected connection */}
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

        {/* Date range */}
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

        {/* Refresh */}
        <Button
          size="small"
          variant="outlined"
          startIcon={
            listLoading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <RefreshOutlinedIcon />
            )
          }
          onClick={handleRefresh}
          disabled={listLoading || !resolvedConnectionId}
        >
          Refresh
        </Button>

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
      </Box>

      {/* 4. No connection selected */}
      {!resolvedConnectionId && (
        <EmptyState
          icon={LinkOutlinedIcon}
          title="No connection selected"
          description="Select a provider and connection above to view payments."
        />
      )}

      {/* 4. Loading */}
      {resolvedConnectionId && listLoading && (
        <Box display="flex" justifyContent="center" pt={4}>
          <CircularProgress />
        </Box>
      )}

      {/* 5. Error — only shown when capability is available but request fails */}
      {resolvedConnectionId && listError && !listLoading && (
        <ErrorState
          title="Could not retrieve payments"
          description="The provider API returned an error. Check your credentials and try again."
          action={
            <Button variant="outlined" onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      )}

      {/* 6. Data table — fixed-height card with internal scroll */}
      {resolvedConnectionId && !listLoading && !listError && (
        <Box
          sx={{
            // Outer card: provides the visual border and clips the DataGrid
            // border (which is set to 'none' inside DataTable).
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          {/* DataGrid with fixed height:
              - sticky column headers (MUI DataGrid default when autoHeight=false)
              - scrollable rows
              - footer with row count pinned at bottom of the fixed-height box
              max(300px, ...) ensures a usable minimum on small viewports.
              The 380px offset accounts for the app bar, page header, filter
              area, breadcrumbs, and the cursor-pagination row below. */}
          <DataTable<PaymentSummary>
            rows={payments}
            columns={columns}
            total={payments.length}
            page={0}
            pageSize={payments.length || 20}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            rowActions={rowActions}
            mobileCardConfig={mobileCardConfig}
            emptyState={emptyState}
            noRowsLabel="No payments found."
            getRowId={(row) => row.id}
            tableHeight="max(300px, calc(100vh - 380px))"
          />

          {/* Cursor pagination — pinned inside the table card at the bottom.
              Uses borderTop so it visually connects to the DataGrid footer. */}
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

      {/* 7. Detail drawer */}
      {viewPaymentId && resolvedConnectionId && (
        <PaymentDetailDrawer
          connectionId={resolvedConnectionId}
          paymentId={viewPaymentId}
          onClose={() => setViewPaymentId(null)}
        />
      )}
    </Box>
  );
}
