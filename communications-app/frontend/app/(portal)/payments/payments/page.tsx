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
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
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
import {
  usePaymentsList,
  usePaymentDetail,
  usePaymentUnits,
  usePaymentBalance,
} from '@/hooks/api/usePayments';
import { PAGE_CAPABILITY, PAGE_FEATURE_DISPLAY_NAME } from '@/lib/config/payments-capability-map';
import { formatAmountMinor } from '@/lib/formatBalance';
import { extractApiMessage } from '@/lib/mapApiError';
import type {
  PaymentSummary,
  PaymentCanonicalStatus,
  ListPaymentsParams,
  PaymentBalanceLine,
  PaymentSummaryCardDefinition,
  PaymentColumnDefinition,
  PaymentsPageDefinition,
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

const STATUS_OPTIONS: Array<{ value: PaymentCanonicalStatus | ''; label: string }> = [
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
    year: 'numeric', month: 'short', day: 'numeric',
  });
}

function truncateId(id: string, len = 20): string {
  return id.length > len ? `${id.slice(0, len)}…` : id;
}

function rowField(row: PaymentSummary, fieldKey: string): unknown {
  return (row as unknown as Record<string, unknown>)[fieldKey];
}

function sumLines(lines: PaymentBalanceLine[]): number {
  return lines.reduce((acc, l) => acc + l.amountMinor, 0);
}

function primaryCurrency(lines: PaymentBalanceLine[]): string {
  return lines[0]?.currency ?? '';
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
  const { data: detail, isLoading, error } = usePaymentDetail(connectionId, paymentId);

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
          <Box>
            <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
              Status
            </Typography>
            <PaymentStatusBadge status={detail.status} size="medium" />
          </Box>

          <Divider />

          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Overview</Typography>
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

          <Box>
            <Typography variant="subtitle2" fontWeight={600} mb={1}>Provider ID</Typography>
            <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
              {detail.providerPaymentId}
            </Typography>
          </Box>

          {(detail.paymentMethodType ?? detail.paymentMethodLabel) && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>Payment Method</Typography>
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

          {(detail.failureCode ?? detail.failureMessage) && (
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
                      <Typography variant="body2" fontFamily="monospace">{detail.failureCode}</Typography>
                    </Box>
                  )}
                  {detail.failureMessage && (
                    <Box>
                      <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
                        Message
                      </Typography>
                      <Typography variant="body2" color="error.main">{detail.failureMessage}</Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {detail.receiptUrl && (
            <>
              <Divider />
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
            </>
          )}

          {detail.providerMetadata && Object.keys(detail.providerMetadata).length > 0 && (
            <>
              <Divider />
              <Box>
                <Typography variant="subtitle2" fontWeight={600} mb={1}>Metadata</Typography>
                <Stack spacing={0.75}>
                  {Object.entries(detail.providerMetadata).map(([k, v]) => (
                    <Box key={k} display="flex" justifyContent="space-between" gap={1}>
                      <Typography variant="body2" color="text.secondary" fontFamily="monospace" sx={{ flexShrink: 0 }}>
                        {k}
                      </Typography>
                      <Typography variant="body2" fontFamily="monospace" sx={{ textAlign: 'right', wordBreak: 'break-all' }}>
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

// ─── Dynamic summary card ─────────────────────────────────────────────────────

interface SummaryCardProps {
  label: string;
  primary: React.ReactNode;
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

// ─── Dynamic summary cards renderer ──────────────────────────────────────────

interface DynamicSummaryCardsProps {
  definition: PaymentsPageDefinition;
  connectionId: string;
  payments: PaymentSummary[];
}

function DynamicSummaryCards({ definition, connectionId, payments }: DynamicSummaryCardsProps) {
  const { getCapabilityStatus, capabilitiesLoading } = usePaymentsContext();

  // Balance data — only fetched when at least one card needs it.
  const needsBalance = definition.summaryCards.some(
    (c) => c.source === 'balance.available' || c.source === 'balance.pending',
  );
  const balanceCapabilityStatus = getCapabilityStatus('balance');
  const balanceEnabled = needsBalance && balanceCapabilityStatus === 'available';

  const {
    data: balance,
    isLoading: balanceDataLoading,
    error: balanceError,
  } = usePaymentBalance(balanceEnabled ? connectionId : null);

  const capabilityKnown = !capabilitiesLoading && balanceCapabilityStatus !== null;
  const balanceLoading = needsBalance && (!capabilityKnown || (balanceEnabled && balanceDataLoading));
  const balanceFailed = balanceEnabled && Boolean(balanceError);
  const balanceReady  = balanceEnabled && !balanceDataLoading && Boolean(balance) && !balanceError;
  const balanceCurrency = balance
    ? primaryCurrency(balance.available) || primaryCurrency(balance.pending)
    : '';

  const notSupportedNode = (
    <Typography variant="body2" color="text.disabled" fontStyle="italic">Not supported</Typography>
  );
  const unavailableNode = (
    <Typography variant="body2" color="text.disabled" fontStyle="italic">Unavailable</Typography>
  );
  const dashNode = (
    <Typography variant="h6" fontWeight={700} color="text.disabled">—</Typography>
  );

  function renderCardPrimary(card: PaymentSummaryCardDefinition): React.ReactNode {
    const cap = card.capability;
    const capStatus = cap ? getCapabilityStatus(cap) : 'available';

    // Balance sources
    if (card.source === 'balance.available' || card.source === 'balance.pending') {
      if (balanceLoading) return null; // SummaryCard's loading prop handles spinner
      if (!capabilityKnown && capStatus === null) return null;
      if (capStatus !== 'available') {
        return card.unavailableBehaviour === 'not_supported' ? notSupportedNode : unavailableNode;
      }
      if (balanceFailed) return unavailableNode;
      if (balanceReady && balance) {
        const lines = card.source === 'balance.available' ? balance.available : balance.pending;
        const amount = sumLines(lines);
        const color = card.source === 'balance.available' ? 'success.main' : 'warning.main';
        return (
          <Typography variant="h6" fontWeight={700} color={color} noWrap>
            {formatAmountMinor(amount, balanceCurrency)}
          </Typography>
        );
      }
      return dashNode;
    }

    // Status count sources (current_page)
    if (card.source === 'page.status' && card.status) {
      const count = payments.filter((p) => p.status === card.status).length;
      const isPositive = count > 0;
      const color =
        card.status === 'succeeded' ? 'success.main'
        : card.status === 'failed' || card.status === 'expired' ? 'error.main'
        : card.status === 'requires_action' ? 'warning.main'
        : 'text.primary';
      return (
        <Typography variant="h6" fontWeight={700} color={isPositive ? color : 'text.primary'}>
          {count}
        </Typography>
      );
    }

    return dashNode;
  }

  function cardSecondary(card: PaymentSummaryCardDefinition): string | undefined {
    if (card.source === 'balance.available') return balanceReady ? 'Current available funds' : undefined;
    if (card.source === 'balance.pending') return balanceReady ? 'Current pending balance' : undefined;
    if (card.scope === 'current_page') return 'payments on this page';
    if (card.scope === 'filtered_result') return 'payments matching current filters';
    return undefined;
  }

  function isCardLoading(card: PaymentSummaryCardDefinition): boolean {
    const src = card.source;
    if (src === 'balance.available' || src === 'balance.pending') return balanceLoading;
    return false;
  }

  if (definition.summaryCards.length === 0) return null;

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1.5, mb: 2, alignItems: 'stretch' }}>
      {definition.summaryCards.map((card) => (
        <SummaryCard
          key={card.key}
          label={card.label}
          loading={isCardLoading(card)}
          primary={renderCardPrimary(card)}
          secondary={cardSecondary(card)}
        />
      ))}
    </Box>
  );
}

// ─── Dynamic filter renderer ──────────────────────────────────────────────────

interface DynamicFiltersProps {
  definition: PaymentsPageDefinition;
  connectionId: string | null;
  filters: Record<string, string>;
  onFilterChange: (key: string, value: string) => void;
  onClear: () => void;
  listLoading: boolean;
  onRefresh: () => void;
}

function DynamicFilters({
  definition,
  connectionId,
  filters,
  onFilterChange,
  onClear,
  listLoading,
  onRefresh,
}: DynamicFiltersProps) {
  const { data: unitsData, isLoading: unitsLoading } = usePaymentUnits(
    definition.filters.some((f) => f.optionsSource === 'payment_units') && connectionId
      ? connectionId
      : null,
  );
  const availableUnits = unitsData?.data ?? [];

  const hasActiveFilters = Object.values(filters).some(Boolean);

  return (
    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center', mb: 2 }}>
      {definition.filters.map((filterDef) => {
        const value = filters[filterDef.key] ?? '';

        if (filterDef.type === 'search') {
          return (
            <TextField
              key={filterDef.key}
              size="small"
              placeholder={filterDef.placeholder ?? `${filterDef.label}…`}
              value={value}
              onChange={(e) => onFilterChange(filterDef.key, e.target.value)}
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

        if (filterDef.type === 'select') {
          if (filterDef.optionsSource === 'payment_statuses') {
            return (
              <FormControl key={filterDef.key} size="small" sx={{ minWidth: 160 }}>
                <Select
                  value={value}
                  displayEmpty
                  onChange={(e) => onFilterChange(filterDef.key, e.target.value as string)}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.value === '' ? <em>All statuses</em> : o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }

          if (filterDef.optionsSource === 'payment_units') {
            return (
              <FormControl
                key={filterDef.key}
                size="small"
                disabled={unitsLoading || !connectionId}
                sx={{ minWidth: { xs: '100%', sm: 160 } }}
              >
                <Select
                  value={value}
                  displayEmpty
                  onChange={(e) => onFilterChange(filterDef.key, e.target.value as string)}
                >
                  <MenuItem value="">
                    <em>
                      {unitsLoading ? 'Loading…' : !connectionId ? 'Select a connection' : (filterDef.placeholder ?? 'All currencies / assets')}
                    </em>
                  </MenuItem>
                  {availableUnits.map((u) => (
                    <MenuItem key={u.code} value={u.code}>
                      {u.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          }
        }

        if (filterDef.type === 'date') {
          return (
            <TextField
              key={filterDef.key}
              size="small"
              type="date"
              label={filterDef.label}
              InputLabelProps={{ shrink: true }}
              value={value}
              onChange={(e) => onFilterChange(filterDef.key, e.target.value)}
              sx={{ width: { xs: '100%', sm: 140 } }}
            />
          );
        }

        return null;
      })}

      {/* Refresh */}
      <Button
        size="small"
        variant="outlined"
        startIcon={
          listLoading
            ? <CircularProgress size={14} color="inherit" />
            : <RefreshOutlinedIcon />
        }
        onClick={onRefresh}
        disabled={listLoading || !connectionId}
      >
        Refresh
      </Button>

      {hasActiveFilters && (
        <Button
          size="small"
          variant="text"
          startIcon={<ClearOutlinedIcon fontSize="small" />}
          onClick={onClear}
        >
          Clear
        </Button>
      )}
    </Box>
  );
}

// ─── Dynamic column definitions ───────────────────────────────────────────────

function buildGridColumns(
  colDefs: PaymentColumnDefinition[],
  onView: (row: PaymentSummary) => void,
  rowActionDefs: PaymentsPageDefinition['rowActions'],
): GridColDef[] {
  return colDefs.map((col): GridColDef | null => {
    const field = col.field ?? col.key;

    if (col.type === 'identifier') {
      return {
        field: col.key,
        headerName: col.label,
        flex: col.flex ?? 1.5,
        minWidth: 160,
        renderCell: (p) => {
          const row = p.row as PaymentSummary;
          const primary = col.field ? String(rowField(row, col.field) ?? '') : row.providerPaymentId;
          const secondary = col.secondaryField ? rowField(row, col.secondaryField) as string | undefined : undefined;
          return (
            <Box>
              <Typography variant="body2" fontFamily="monospace" fontSize="0.75rem">
                {truncateId(primary)}
              </Typography>
              {secondary && (
                <Typography variant="caption" color="text.secondary" display="block">
                  {secondary}
                </Typography>
              )}
            </Box>
          );
        },
      };
    }

    if (col.type === 'amount') {
      return {
        field: col.key,
        headerName: col.label,
        width: col.width ?? 120,
        renderCell: (p) => {
          const row = p.row as PaymentSummary;
          return (
            <Typography variant="body2" fontWeight={600}>
              {formatAmountMinor(row.amountMinor, row.currency)}
            </Typography>
          );
        },
      };
    }

    if (col.type === 'payment_unit') {
      return {
        field: col.key,
        headerName: col.label,
        width: col.width ?? 120,
        renderCell: (p) => {
          const row = p.row as PaymentSummary;
          const val = field ? rowField(row, field) as string : row.currency;
          return (
            <Typography variant="body2" fontFamily="monospace">
              {String(val ?? '').toUpperCase()}
            </Typography>
          );
        },
      };
    }

    if (col.type === 'method') {
      return {
        field: col.key,
        headerName: col.label,
        width: col.width ?? 150,
        renderCell: (p) => {
          const row = p.row as PaymentSummary;
          const label = row.paymentMethodLabel ?? row.paymentMethodType ?? '—';
          return <Typography variant="body2">{label}</Typography>;
        },
      };
    }

    if (col.type === 'status') {
      return {
        field: col.key,
        headerName: col.label,
        width: col.width ?? 160,
        renderCell: (p) => <PaymentStatusBadge status={(p.row as PaymentSummary).status} />,
      };
    }

    if (col.type === 'date') {
      return {
        field: col.key,
        headerName: col.label,
        width: col.width ?? 120,
        renderCell: (p) => {
          const row = p.row as PaymentSummary;
          const val = field ? rowField(row, field) : row.createdAt;
          return (
            <Typography variant="body2" color="text.secondary">
              {formatDate(String(val ?? ''))}
            </Typography>
          );
        },
      };
    }

    if (col.type === 'text') {
      return {
        field: col.key,
        headerName: col.label,
        width: col.width ?? 140,
        renderCell: (p) => {
          const row = p.row as PaymentSummary;
          const val = field ? rowField(row, field) : undefined;
          return <Typography variant="body2">{String(val ?? '—')}</Typography>;
        },
      };
    }

    if (col.type === 'actions') {
      return {
        field: col.key,
        headerName: '',
        width: col.width ?? 80,
        sortable: false,
        renderCell: (p) => {
          const row = p.row as PaymentSummary;
          return (
            <RowActions>
              {rowActionDefs.map((action) => {
                if (action.type === 'view') {
                  return (
                    <Tooltip key={action.key} title={action.label}>
                      <IconButton size="small" onClick={() => onView(row)}>
                        <VisibilityOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  );
                }

                if (action.type === 'open_url' && action.field) {
                  const url = action.field ? rowField(row, action.field!) as string | undefined : undefined;
                  if (!url) return null;
                  return (
                    <Tooltip key={action.key} title={action.label}>
                      <IconButton
                        size="small"
                        component="a"
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <OpenInNewOutlinedIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  );
                }

                return null;
              })}
            </RowActions>
          );
        },
      };
    }

    return null;
  }).filter((col): col is GridColDef => col !== null);
}

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
    pageDefinition,
    pageDefinitionLoading,
    pageDefinitionError,
  } = usePaymentsContext();

  const capabilityStatus = getCapabilityStatus(PAGE_CAPABILITY.payments);
  const capabilityBlocks =
    Boolean(resolvedProviderKey) &&
    Boolean(capabilityStatus) &&
    capabilityStatus !== 'available';

  // ── Dynamic filter state ──────────────────────────────────────────────────
  // Keyed by filter.key from the active definition. Reset when connection changes.
  const [filterValues, setFilterValues] = useState<Record<string, string>>({});
  const [cursor, setCursor] = useState<string | undefined>(undefined);
  const [cursorStack, setCursorStack] = useState<string[]>([]);
  const [viewPaymentId, setViewPaymentId] = useState<string | null>(null);

  // Clear all state when connection changes.
  useEffect(() => {
    setFilterValues({});
    setCursor(undefined);
    setCursorStack([]);
    setViewPaymentId(null);
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

  // ── Build list query params from active filter values ─────────────────────
  const queryParams = useMemo<ListPaymentsParams>(() => {
    const p: ListPaymentsParams = {
      limit: pageDefinition?.list.defaultPageSize ?? 20,
    };
    if (cursor) p.cursor = cursor;
    if (filterValues['status']) p.status = filterValues['status'] as PaymentCanonicalStatus;
    if (filterValues['currency']?.trim()) p.currency = filterValues['currency'].trim();
    if (filterValues['createdFrom']) p.createdFrom = filterValues['createdFrom'];
    if (filterValues['createdTo']) p.createdTo = filterValues['createdTo'];
    if (filterValues['search']?.trim()) p.search = filterValues['search'].trim();
    return p;
  }, [cursor, filterValues, pageDefinition]);

  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
    refetch,
  } = usePaymentsList(
    capabilityBlocks || !pageDefinition || !resolvedConnectionId ? null : resolvedConnectionId,
    queryParams,
  );

  const payments = useMemo(() => listData?.data ?? [], [listData]);
  const hasMore = listData?.hasMore ?? false;
  const nextCursor = listData?.nextCursor;

  const handleRefresh = useCallback(() => { void refetch(); }, [refetch]);

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

  // ── Build MUI DataGrid columns from definition ────────────────────────────
  const columns = useMemo<GridColDef[]>(() => {
    if (!pageDefinition) return [];
    return buildGridColumns(
      pageDefinition.columns,
      (row) => setViewPaymentId(row.id),
      pageDefinition.rowActions,
    );
  }, [pageDefinition]);

  const mobileCardConfig = useMemo<MobileCardConfig<PaymentSummary>>(
    () => ({
      primaryText: (row) => truncateId(row.providerPaymentId, 24),
      secondaryText: (row) => row.description ?? row.paymentMethodLabel ?? '',
      badge: (row) => <PaymentStatusBadge status={row.status} />,
      fields: [
        { field: 'amountMinor', label: 'Amount', render: (_v, row) => formatAmountMinor((row as PaymentSummary).amountMinor, (row as PaymentSummary).currency) },
        { field: 'createdAt',   label: 'Created', render: (v) => formatDate(String(v)) },
      ],
    }),
    [],
  );

  const pageSubtitle = selectedConnection
    ? `Connection: ${connectionLabel(selectedConnection)}`
    : undefined;

  // ── Guard states ──────────────────────────────────────────────────────────

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

  // No connection selected
  if (!resolvedConnectionId) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader
          title="Payments"
          breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Payments' }]}
        />
        <PaymentsFilter />
        <EmptyState
          icon={LinkOutlinedIcon}
          title="No connection selected"
          description="Select a provider and connection above to view payments."
        />
      </Box>
    );
  }

  // Page definition loading
  if (pageDefinitionLoading) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader title="Payments" breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Payments' }]} />
        <PaymentsFilter />
        <Box display="flex" justifyContent="center" pt={8}>
          <CircularProgress />
        </Box>
      </Box>
    );
  }

  // Page definition error — prevent list queries, show safe error
  if (pageDefinitionError || !pageDefinition) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader title="Payments" breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Payments' }]} />
        <PaymentsFilter />
        <ErrorState
          title="Could not load page configuration"
          description={
            pageDefinitionError
              ? extractApiMessage(pageDefinitionError, 'The provider configuration could not be loaded. Please try again.')
              : 'The page configuration could not be loaded. Please try again.'
          }
          action={
            <Button
              variant="outlined"
              onClick={() => {
                void refetch();
              }}
            >
              Retry
            </Button>
          }
        />
      </Box>
    );
  }

  const hasActiveFilters = Object.values(filterValues).some(Boolean);

  const emptyStateEl = (
    <EmptyState
      icon={PaymentsOutlinedIcon}
      title={hasActiveFilters ? 'No payments match your filters' : (pageDefinition.emptyState.title)}
      description={
        hasActiveFilters
          ? 'Try adjusting your search or filters.'
          : pageDefinition.emptyState.description
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
        title="Payments"
        subtitle={pageSubtitle}
        count={resolvedConnectionId && !listLoading ? payments.length : undefined}
        breadcrumbs={[{ label: 'Payments', href: '/payments' }, { label: 'Payments' }]}
      />

      {/* 1. Provider + Connection selectors */}
      <PaymentsFilter />

      {/* 2. Definition-driven summary cards */}
      <DynamicSummaryCards
        definition={pageDefinition}
        connectionId={resolvedConnectionId}
        payments={payments}
      />

      {/* 3. Definition-driven filters + refresh/clear */}
      <DynamicFilters
        definition={pageDefinition}
        connectionId={resolvedConnectionId}
        filters={filterValues}
        onFilterChange={handleFilterChange}
        onClear={clearFilters}
        listLoading={listLoading}
        onRefresh={handleRefresh}
      />

      {/* 4. Loading */}
      {listLoading && (
        <Box display="flex" justifyContent="center" pt={4}>
          <CircularProgress />
        </Box>
      )}

      {/* 5. Error */}
      {listError && !listLoading && (
        <ErrorState
          title="Could not retrieve payments"
          description={extractApiMessage(
            listError,
            'The provider API returned an error. Check your credentials and try again.',
          )}
          action={
            <Button variant="outlined" onClick={handleRefresh}>
              Retry
            </Button>
          }
        />
      )}

      {/* 6. Definition-driven data table */}
      {!listLoading && !listError && (
        <Box
          sx={{
            border: 1,
            borderColor: 'divider',
            borderRadius: 2,
            overflow: 'hidden',
          }}
        >
          <DataTable<PaymentSummary>
            rows={payments}
            columns={columns}
            total={payments.length}
            page={0}
            pageSize={payments.length || pageDefinition.list.defaultPageSize}
            onPageChange={() => {}}
            onPageSizeChange={() => {}}
            mobileCardConfig={mobileCardConfig}
            emptyState={emptyStateEl}
            noRowsLabel="No payments found."
            getRowId={(row) => row.id}
            tableHeight="max(300px, calc(100vh - 380px))"
          />

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
