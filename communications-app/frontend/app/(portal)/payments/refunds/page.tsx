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
import InputLabel from '@mui/material/InputLabel';
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
  usePaymentsList,
  usePaymentDetail,
  usePaymentUnits,
} from '@/hooks/api/usePayments';
import { formatAmountMinor } from '@/lib/formatBalance';
import { PAGE_CAPABILITY, PAGE_FEATURE_DISPLAY_NAME } from '@/lib/config/payments-capability-map';
import type {
  RefundSummary,
  RefundCanonicalStatus,
  ListRefundsParams,
  CreateRefundInput,
  RefundCanonicalReason,
} from '@/types/payments';

// ─── Status badge ─────────────────────────────────────────────────────────────

const REFUND_STATUS_CONFIG: Record<
  RefundCanonicalStatus,
  { label: string; color: 'success' | 'error' | 'warning' | 'info' | 'default' }
> = {
  succeeded:       { label: 'Succeeded',       color: 'success' },
  failed:          { label: 'Failed',           color: 'error'   },
  pending:         { label: 'Pending',          color: 'default' },
  cancelled:       { label: 'Cancelled',        color: 'default' },
  requires_action: { label: 'Requires Action',  color: 'warning' },
  unknown:         { label: 'Unknown',          color: 'default' },
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

/**
 * Converts a human-typed major-unit amount string to integer minor units.
 * Uses Intl.NumberFormat to determine the correct exponent per currency.
 */
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

/**
 * Converts integer minor units to a major-unit number for display in inputs.
 */
function minorToMajor(minor: number, currency: string): number {
  try {
    const formatter = new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    });
    const exp = formatter.resolvedOptions().minimumFractionDigits ?? 2;
    return minor / Math.pow(10, exp);
  } catch {
    return minor / 100;
  }
}

// ─── Status filter options ────────────────────────────────────────────────────

const STATUS_FILTER_OPTIONS: Array<{
  value: RefundCanonicalStatus | '';
  label: string;
}> = [
  { value: '',                label: 'All statuses'    },
  { value: 'succeeded',       label: 'Succeeded'       },
  { value: 'failed',          label: 'Failed'          },
  { value: 'pending',         label: 'Pending'         },
  { value: 'cancelled',       label: 'Cancelled'       },
  { value: 'requires_action', label: 'Requires Action' },
  { value: 'unknown',         label: 'Unknown'         },
];

// ─── Refund reason options ─────────────────────────────────────────────────────

const REASON_OPTIONS: Array<{ value: RefundCanonicalReason | ''; label: string }> = [
  { value: '',                       label: 'No reason specified'    },
  { value: 'duplicate',              label: 'Duplicate'              },
  { value: 'fraudulent',             label: 'Fraudulent'             },
  { value: 'requested_by_customer',  label: 'Requested by customer'  },
];

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
            <RefundStatusBadge status={detail.status} size="medium" />
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

          {/* Amounts */}
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
                </Stack>
              </Box>
            </>
          )}

          {/* Receipt number */}
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

// ─── Create Refund drawer ─────────────────────────────────────────────────────

function CreateRefundDrawer({
  connectionId,
  onClose,
}: {
  connectionId: string;
  onClose: () => void;
}) {
  const [selectedPaymentId, setSelectedPaymentId] = useState('');
  const [refundType, setRefundType] = useState<'full' | 'partial'>('full');
  const [amountInput, setAmountInput] = useState('');
  const [reason, setReason] = useState<RefundCanonicalReason | ''>('');

  const createRefundMutation = useCreateRefundMutation(connectionId);

  // Fetch recently succeeded payments to use as options in the selector
  const { data: paymentsData, isLoading: paymentsLoading } = usePaymentsList(
    connectionId,
    { status: 'succeeded', limit: 50 },
  );

  // Fetch detail of selected payment to get amounts
  const { data: paymentDetail, isLoading: paymentDetailLoading } =
    usePaymentDetail(
      connectionId,
      selectedPaymentId || null,
    );

  const currency = paymentDetail?.currency ?? 'usd';

  // Derived refundable amount
  const remainingMinor =
    paymentDetail !== undefined
      ? (paymentDetail.amountReceivedMinor ?? paymentDetail.amountMinor) -
        (paymentDetail.amountRefundedMinor ?? 0)
      : 0;

  // Pre-fill full refund amount when payment is selected
  useEffect(() => {
    if (refundType === 'full' && remainingMinor > 0) {
      setAmountInput(String(minorToMajor(remainingMinor, currency)));
    }
  }, [refundType, remainingMinor, currency]);

  const handleSubmit = () => {
    if (!selectedPaymentId) return;

    const amountMinor =
      refundType === 'full'
        ? undefined // let backend determine full refund
        : majorToMinor(amountInput, currency);

    const dto: CreateRefundInput = {
      paymentId: selectedPaymentId,
      amountMinor,
      reason: reason || undefined,
    };

    createRefundMutation.mutate(dto, { onSuccess: () => onClose() });
  };

  const payments = paymentsData?.data ?? [];
  const canSubmit =
    Boolean(selectedPaymentId) &&
    !createRefundMutation.isPending &&
    (refundType === 'full' ||
      (amountInput.trim() !== '' &&
        !isNaN(parseFloat(amountInput)) &&
        parseFloat(amountInput) > 0));

  return (
    <FormDrawer
      open
      onClose={onClose}
      title="Create Refund"
      actions={
        <Stack direction="row" spacing={1} width="100%">
          <Button variant="outlined" onClick={onClose} fullWidth>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!canSubmit}
            fullWidth
          >
            {createRefundMutation.isPending ? (
              <CircularProgress size={18} color="inherit" />
            ) : (
              'Create Refund'
            )}
          </Button>
        </Stack>
      }
    >
      <Stack spacing={2.5}>
        {/* Payment selector */}
        <FormControl size="small" fullWidth>
          <InputLabel>Payment</InputLabel>
          <Select
            value={selectedPaymentId}
            label="Payment"
            onChange={(e) => {
              setSelectedPaymentId(e.target.value);
              setAmountInput('');
            }}
            disabled={paymentsLoading}
          >
            {paymentsLoading && (
              <MenuItem value="" disabled>
                Loading payments…
              </MenuItem>
            )}
            {!paymentsLoading && payments.length === 0 && (
              <MenuItem value="" disabled>
                No succeeded payments found
              </MenuItem>
            )}
            {payments.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                <Box>
                  <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                    {truncateId(p.providerPaymentId, 28)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {formatAmountMinor(p.amountMinor, p.currency)}
                  </Typography>
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Payment amounts summary */}
        {selectedPaymentId && paymentDetailLoading && (
          <Box display="flex" justifyContent="center" py={1}>
            <CircularProgress size={20} />
          </Box>
        )}

        {selectedPaymentId && paymentDetail && !paymentDetailLoading && (
          <Box
            sx={{
              bgcolor: 'background.default',
              border: 1,
              borderColor: 'divider',
              borderRadius: 1,
              p: 1.5,
            }}
          >
            <Stack spacing={0.75}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  Original amount
                </Typography>
                <Typography variant="caption" fontWeight={600}>
                  {formatAmountMinor(
                    paymentDetail.amountReceivedMinor ?? paymentDetail.amountMinor,
                    currency,
                  )}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  Already refunded
                </Typography>
                <Typography variant="caption">
                  {formatAmountMinor(
                    paymentDetail.amountRefundedMinor ?? 0,
                    currency,
                  )}
                </Typography>
              </Box>
              <Divider sx={{ my: 0.25 }} />
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  Refundable amount
                </Typography>
                <Typography variant="caption" fontWeight={600} color="success.main">
                  {formatAmountMinor(remainingMinor, currency)}
                </Typography>
              </Box>
            </Stack>
          </Box>
        )}

        {/* Refund type */}
        <FormControl size="small" fullWidth>
          <InputLabel>Refund type</InputLabel>
          <Select
            value={refundType}
            label="Refund type"
            onChange={(e) => {
              const val = e.target.value as 'full' | 'partial';
              setRefundType(val);
              if (val === 'full') {
                setAmountInput(
                  remainingMinor > 0
                    ? String(minorToMajor(remainingMinor, currency))
                    : '',
                );
              } else {
                setAmountInput('');
              }
            }}
            disabled={!selectedPaymentId}
          >
            <MenuItem value="full">Full refund</MenuItem>
            <MenuItem value="partial">Partial refund</MenuItem>
          </Select>
        </FormControl>

        {/* Amount input — only editable for partial refunds */}
        <TextField
          size="small"
          label={`Amount (${currency.toUpperCase()})`}
          value={amountInput}
          onChange={(e) => setAmountInput(e.target.value)}
          disabled={refundType === 'full' || !selectedPaymentId}
          type="number"
          inputProps={{ step: 'any', min: 0 }}
          helperText={
            refundType === 'full'
              ? 'Full amount will be refunded'
              : 'Enter amount in major units (e.g. 10.00)'
          }
          fullWidth
        />

        {/* Reason */}
        <FormControl size="small" fullWidth>
          <InputLabel>Reason (optional)</InputLabel>
          <Select
            value={reason}
            label="Reason (optional)"
            onChange={(e) =>
              setReason(e.target.value as RefundCanonicalReason | '')
            }
          >
            {REASON_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.value === '' ? <em>{o.label}</em> : o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>
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

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState<RefundCanonicalStatus | ''>('');
  const [filterCurrency, setFilterCurrency] = useState('');
  const [createdFrom, setCreatedFrom] = useState('');
  const [createdTo, setCreatedTo] = useState('');

  // ── Cursor-based pagination ──────────────────────────────────────────────────
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);

  // ── Drawers ──────────────────────────────────────────────────────────────────
  const [viewRefundId, setViewRefundId] = useState<string | null>(null);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  // ── Payment units (provider-driven currency / asset options) ────────────────
  const { data: unitsData, isLoading: unitsLoading } = usePaymentUnits(
    capabilityBlocks ? null : resolvedConnectionId || null,
  );
  const availableUnits = unitsData?.data ?? [];

  // Reset pagination + drawers when connection changes
  useEffect(() => {
    setCursor(undefined);
    setCursorStack([]);
    setViewRefundId(null);
    setFilterStatus('');
    setFilterCurrency('');
    setSearch('');
    setShowCreateDrawer(false);
  }, [resolvedConnectionId]);

  const queryParams = useMemo<ListRefundsParams>(() => {
    const p: ListRefundsParams = { limit: 20 };
    if (cursor) p.cursor = cursor;
    if (filterCurrency.trim()) p.currency = filterCurrency.trim();
    if (createdFrom) p.createdFrom = createdFrom;
    if (createdTo) p.createdTo = createdTo;
    if (search.trim()) p.search = search.trim();
    return p;
  }, [cursor, filterCurrency, createdFrom, createdTo, search]);

  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
    refetch,
  } = useRefundsList(capabilityBlocks ? null : resolvedConnectionId || null, queryParams);

  // Client-side status filter (Stripe refunds API has no server-side status filter)
  const allRefunds = useMemo(() => listData?.data ?? [], [listData]);
  const refunds = useMemo(
    () =>
      filterStatus
        ? allRefunds.filter((r) => r.status === filterStatus)
        : allRefunds,
    [allRefunds, filterStatus],
  );
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
        headerName: 'Refund',
        flex: 1.5,
        minWidth: 160,
        renderCell: (p) => {
          const row = p.row as RefundSummary;
          return (
            <Box>
              <Typography
                variant="body2"
                fontFamily="monospace"
                fontSize="0.75rem"
              >
                {truncateId(row.providerRefundId)}
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                fontFamily="monospace"
                fontSize="0.7rem"
              >
                {truncateId(row.providerPaymentId, 18)}
              </Typography>
            </Box>
          );
        },
      },
      {
        field: 'amountMinor',
        headerName: 'Amount',
        width: 120,
        renderCell: (p) => {
          const row = p.row as RefundSummary;
          return (
            <Typography variant="body2" fontWeight={600}>
              {formatAmountMinor(row.amountMinor, row.currency)}
            </Typography>
          );
        },
      },
      {
        field: 'reason',
        headerName: 'Reason',
        width: 180,
        renderCell: (p) => {
          const row = p.row as RefundSummary;
          return (
            <Typography variant="body2" color="text.secondary">
              {row.reason ?? '—'}
            </Typography>
          );
        },
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 150,
        renderCell: (p) => (
          <RefundStatusBadge status={(p.row as RefundSummary).status} />
        ),
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 120,
        renderCell: (p) => (
          <Typography variant="body2" color="text.secondary">
            {formatDate((p.row as RefundSummary).createdAt)}
          </Typography>
        ),
      },
    ],
    [],
  );

  const rowActions = useCallback(
    (row: RefundSummary) => (
      <RowActions>
        <Tooltip title="View details">
          <IconButton size="small" onClick={() => setViewRefundId(row.id)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </RowActions>
    ),
    [],
  );

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
          field: 'reason',
          label: 'Reason',
          render: (v) => (v ? String(v) : '—'),
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
      icon={MoneyOffOutlinedIcon}
      title={
        hasActiveFilters ? 'No refunds match your filters' : 'No refunds found'
      }
      description={
        hasActiveFilters
          ? 'Try adjusting your search or filters.'
          : 'Refunds processed through the connected provider will appear here.'
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
          breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Refunds' }]}
        />
        <PaymentsFilter />
        <ProviderFeatureUnavailable
          featureDisplayName={PAGE_FEATURE_DISPLAY_NAME.refunds}
          providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey}
          status={capabilityStatus as 'planned' | 'unsupported'}
        />
      </Box>
    );
  }

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
          resolvedConnectionId ? (
            <Stack direction="row" spacing={1}>
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
              <Button
                variant="contained"
                size="small"
                startIcon={<AddOutlinedIcon />}
                onClick={() => setShowCreateDrawer(true)}
              >
                New Refund
              </Button>
            </Stack>
          ) : undefined
        }
      />

      {/* 1. Shared filter: Provider + Connection + page-specific filters */}
      <PaymentsFilter>
        {/* Search */}
        <TextField
          size="small"
          placeholder="Search by ID…"
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
              setFilterStatus(e.target.value as RefundCanonicalStatus | '');
            }}
          >
            {STATUS_FILTER_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.value === '' ? <em>{o.label}</em> : o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Currency / Asset */}
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

      {/* 2. No connection selected */}
      {!resolvedConnectionId && (
        <EmptyState
          icon={LinkOutlinedIcon}
          title="No connection selected"
          description="Select a provider and connection above to view refunds."
        />
      )}

      {/* 3. Loading */}
      {resolvedConnectionId && listLoading && (
        <Box display="flex" justifyContent="center" pt={4}>
          <CircularProgress />
        </Box>
      )}

      {/* 4. Error */}
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

      {/* 5. Data table */}
      {resolvedConnectionId && !listLoading && !listError && (
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
            pageSize={refunds.length || 20}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            rowActions={rowActions}
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

      {/* 7. Create refund drawer */}
      {showCreateDrawer && resolvedConnectionId && (
        <CreateRefundDrawer
          connectionId={resolvedConnectionId}
          onClose={() => setShowCreateDrawer(false)}
        />
      )}
    </Box>
  );
}
