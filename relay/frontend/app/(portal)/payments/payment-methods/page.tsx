'use client';

import React, { useCallback, useMemo, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import PaymentsOutlinedIcon from '@mui/icons-material/PaymentsOutlined';
import RemoveCircleOutlineOutlinedIcon from '@mui/icons-material/RemoveCircleOutlineOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import type { GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  ErrorState,
  FormDrawer,
  RowActions,
  type MobileCardConfig,
} from '@/components/shared';
import { PaymentsFilter } from '@/components/domain/payment/PaymentsFilter';
import { PaymentMethodStatusBadge } from '@/components/domain/payment/PaymentMethodStatusBadge';
import { ProviderFeatureUnavailable } from '@/components/domain/payment/ProviderFeatureUnavailable';
import { usePaymentsContext, connectionLabel } from '@/providers/PaymentsProvider';
import {
  usePaymentMethodConfigurations,
  useUpdatePaymentMethodMutation,
} from '@/hooks/api/usePayments';
import { PAGE_CAPABILITY, PAGE_FEATURE_DISPLAY_NAME } from '@/lib/config/payments-capability-map';
import type {
  PaymentMethodConfiguration,
  PaymentMethodType,
} from '@/types/payments';

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_LABEL: Record<PaymentMethodType, string> = {
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  wallet: 'Wallet',
  buy_now_pay_later: 'Buy Now Pay Later',
  voucher: 'Voucher',
  direct_debit: 'Direct Debit',
  crypto: 'Crypto',
  other: 'Other',
};

const PAGE_SIZE = 25;

// ─── Per-row remove button (needs its own mutation instance) ──────────────────

function RemoveButton({
  method,
  connectionId,
}: {
  method: PaymentMethodConfiguration;
  connectionId: string;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useUpdatePaymentMethodMutation(connectionId, method.id);

  const handleConfirm = useCallback(() => {
    setConfirmOpen(false);
    // Disable in provider — no local persistence; query invalidation handled by hook
    mutation.mutateAsync({ enabled: false }).catch(() => {});
  }, [mutation]);

  return (
    <>
      <Tooltip title="Remove (disable in provider)">
        <span>
          <IconButton
            size="small"
            color="error"
            onClick={() => setConfirmOpen(true)}
            disabled={!method.configurable || mutation.isPending}
          >
            {mutation.isPending ? (
              <CircularProgress size={14} />
            ) : (
              <RemoveCircleOutlineOutlinedIcon fontSize="small" />
            )}
          </IconButton>
        </span>
      </Tooltip>

      <ConfirmDialog
        open={confirmOpen}
        title={`Remove ${method.displayName}?`}
        description="This will disable the payment method in your provider configuration immediately. It will no longer be available at checkout. You can re-enable it later."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={handleConfirm}
        onCancel={() => setConfirmOpen(false)}
        loading={mutation.isPending}
        danger
      />
    </>
  );
}

// ─── View drawer (read-only detail + remove action) ───────────────────────────

function MethodViewDrawer({
  method,
  connectionId,
  onClose,
}: {
  method: PaymentMethodConfiguration | null;
  connectionId: string;
  onClose: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useUpdatePaymentMethodMutation(
    connectionId,
    method?.id ?? '',
  );

  const handleConfirmRemove = useCallback(() => {
    setConfirmOpen(false);
    mutation
      .mutateAsync({ enabled: false })
      .then(() => onClose())
      .catch(() => {});
  }, [mutation, onClose]);

  if (!method) return null;

  return (
    <>
      <FormDrawer
        open
        onClose={onClose}
        title={method.displayName}
        actions={
          <Box display="flex" gap={1} width="100%">
            <Button variant="outlined" onClick={onClose} sx={{ flex: 1 }}>
              Close
            </Button>
            {method.configurable && (
              <Button
                variant="contained"
                color="error"
                onClick={() => setConfirmOpen(true)}
                disabled={mutation.isPending}
                sx={{ flex: 1 }}
                startIcon={
                  mutation.isPending ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    <RemoveCircleOutlineOutlinedIcon />
                  )
                }
              >
                {mutation.isPending ? 'Removing…' : 'Remove'}
              </Button>
            )}
          </Box>
        }
      >
        <Stack spacing={2.5}>
          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Provider Identifier
            </Typography>
            <Typography variant="body2" fontFamily="monospace">
              {method.id}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Canonical Type
            </Typography>
            <Chip
              label={TYPE_LABEL[method.type] ?? method.type}
              size="small"
              variant="outlined"
            />
          </Box>

          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Provider Status
            </Typography>
            <PaymentMethodStatusBadge status={method.status} />
          </Box>

          <Divider />

          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Available from provider
            </Typography>
            <Typography variant="body2">
              {method.available ? 'Yes' : 'No'}
            </Typography>
          </Box>

          <Box>
            <Typography
              variant="caption"
              color="text.secondary"
              display="block"
              mb={0.5}
            >
              Configurable via API
            </Typography>
            <Typography variant="body2">
              {method.configurable
                ? 'Yes'
                : 'No — managed by provider or parent configuration'}
            </Typography>
          </Box>

          {method.reason && (
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
                mb={0.5}
              >
                Reason / Restriction
              </Typography>
              <Typography variant="body2" color="warning.main">
                {method.reason}
              </Typography>
            </Box>
          )}
        </Stack>
      </FormDrawer>

      <ConfirmDialog
        open={confirmOpen}
        title={`Remove ${method.displayName}?`}
        description="This will disable the payment method in your provider configuration immediately. It will no longer be available at checkout."
        confirmLabel="Remove"
        cancelLabel="Cancel"
        onConfirm={handleConfirmRemove}
        onCancel={() => setConfirmOpen(false)}
        loading={mutation.isPending}
        danger
      />
    </>
  );
}

// ─── Toolbar: Add method + provider counts ────────────────────────────────────

function AddMethodToolbar({
  allMethods,
  connectionId,
}: {
  allMethods: PaymentMethodConfiguration[];
  connectionId: string;
}) {
  const [selectedToAdd, setSelectedToAdd] = useState('');

  // Methods available to add:
  //   - not currently enabled  (enabled === false)
  //   - configurable via API   (configurable === true, i.e. overridable !== false)
  //
  // The m.available check is intentionally REMOVED.
  // Stripe's `available` means "currently offered at checkout" which is false for
  // disabled methods — this does NOT mean they cannot be enabled.
  const availableMethods = useMemo(
    () => allMethods.filter((m) => !m.enabled && m.configurable),
    [allMethods],
  );

  // Counts come directly from the provider response — no manual calculation
  const total = allMethods.length;
  const enabledCount = allMethods.filter((m) => m.enabled).length;
  const disabledCount = total - enabledCount;

  // Mutation scoped to the currently selected method
  const addMutation = useUpdatePaymentMethodMutation(
    connectionId,
    selectedToAdd,
  );

  const handleAdd = useCallback(async () => {
    if (!selectedToAdd) return;
    try {
      // Enable in provider; hook's onSuccess invalidates the query and shows toast
      await addMutation.mutateAsync({ enabled: true });
      setSelectedToAdd('');
    } catch {
      // error toast handled by hook's onError
    }
  }, [selectedToAdd, addMutation]);

  return (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
      <Box
        display="flex"
        alignItems="center"
        justifyContent="space-between"
        flexWrap="wrap"
        gap={1.5}
      >
        {/* Add method selector */}
        <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ whiteSpace: 'nowrap' }}
          >
            Add method:
          </Typography>
          <FormControl size="small" sx={{ minWidth: 220 }}>
            <Select
              value={selectedToAdd}
              onChange={(e) => setSelectedToAdd(e.target.value)}
              displayEmpty
              disabled={availableMethods.length === 0 || addMutation.isPending}
            >
              <MenuItem value="" disabled>
                {availableMethods.length === 0
                  ? 'No methods available'
                  : 'Select a method…'}
              </MenuItem>
              {availableMethods.map((m) => (
                <MenuItem key={m.id} value={m.id}>
                  {m.displayName}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Button
            variant="contained"
            size="small"
            onClick={() => void handleAdd()}
            disabled={!selectedToAdd || addMutation.isPending}
            startIcon={
              addMutation.isPending ? (
                <CircularProgress size={12} color="inherit" />
              ) : (
                <AddOutlinedIcon />
              )
            }
          >
            {addMutation.isPending ? 'Adding…' : 'Add'}
          </Button>
        </Box>

        {/* Provider counts — sourced directly from provider response */}
        {total > 0 && (
          <Box display="flex" gap={2} alignItems="center">
            <Typography variant="caption" color="text.secondary">
              Total:{' '}
              <Typography
                component="span"
                variant="caption"
                fontWeight={600}
                color="text.primary"
              >
                {total}
              </Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Enabled:{' '}
              <Typography
                component="span"
                variant="caption"
                fontWeight={600}
                color="success.main"
              >
                {enabledCount}
              </Typography>
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Disabled:{' '}
              <Typography
                component="span"
                variant="caption"
                fontWeight={600}
                color="text.secondary"
              >
                {disabledCount}
              </Typography>
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentMethodsPage() {
  const {
    connections,
    connectionsLoading,
    connectionsError,
    resolvedConnectionId,
    resolvedProviderKey,
    selectedProvider,
    selectedConnection,
    getCapabilityStatus,
  } = usePaymentsContext();

  const capabilityStatus = getCapabilityStatus(PAGE_CAPABILITY.paymentMethods);
  const capabilityBlocks =
    Boolean(resolvedProviderKey) &&
    Boolean(capabilityStatus) &&
    capabilityStatus !== 'available';

  const {
    data: methodsData,
    isLoading: methodsLoading,
    error: methodsError,
  } = usePaymentMethodConfigurations(capabilityBlocks ? null : resolvedConnectionId || null);

  // All methods as returned by the provider — no modifications
  const allMethods = useMemo(() => methodsData?.data ?? [], [methodsData]);

  // Table shows only enabled methods from the provider response
  const enabledMethods = useMemo(
    () => allMethods.filter((m) => m.enabled),
    [allMethods],
  );

  // ── Page-level filters (operate on enabled methods already returned) ───────
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<PaymentMethodType | ''>('');
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE);
  const [viewMethod, setViewMethod] = useState<PaymentMethodConfiguration | null>(null);

  const filtered = useMemo(() => {
    return enabledMethods.filter((m) => {
      if (search) {
        const q = search.toLowerCase();
        if (
          !m.displayName.toLowerCase().includes(q) &&
          !m.id.toLowerCase().includes(q) &&
          !m.type.toLowerCase().includes(q)
        ) {
          return false;
        }
      }
      if (filterType && m.type !== filterType) return false;
      return true;
    });
  }, [enabledMethods, search, filterType]);

  const pageRows = useMemo(
    () => filtered.slice(page * pageSize, (page + 1) * pageSize),
    [filtered, page, pageSize],
  );

  const hasActiveFilters = Boolean(search || filterType);

  const clearFilters = useCallback(() => {
    setSearch('');
    setFilterType('');
    setPage(0);
  }, []);

  const pageSubtitle = selectedConnection
    ? `Connection: ${connectionLabel(selectedConnection)}`
    : undefined;

  // ── Table columns (enabled-only; "Enabled" column removed) ────────────────
  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'displayName',
        headerName: 'Method',
        flex: 1.5,
        minWidth: 160,
        renderCell: (p) => {
          const m = p.row as PaymentMethodConfiguration;
          return (
            <Typography variant="body2" fontWeight={500}>
              {m.displayName}
            </Typography>
          );
        },
      },
      {
        field: 'type',
        headerName: 'Type',
        width: 150,
        renderCell: (p) => (
          <Chip
            label={TYPE_LABEL[(p.row as PaymentMethodConfiguration).type]}
            size="small"
            variant="outlined"
          />
        ),
      },
      {
        field: 'status',
        headerName: 'Status',
        width: 120,
        renderCell: (p) => (
          <PaymentMethodStatusBadge
            status={(p.row as PaymentMethodConfiguration).status}
          />
        ),
      },
      {
        field: 'configurable',
        headerName: 'Configured',
        width: 110,
        renderCell: (p) => {
          const m = p.row as PaymentMethodConfiguration;
          return (
            <Typography
              variant="body2"
              color={m.configurable ? 'text.primary' : 'text.disabled'}
            >
              {m.configurable ? 'Via API' : 'Fixed'}
            </Typography>
          );
        },
      },
    ],
    [],
  );

  const rowActions = useCallback(
    (row: PaymentMethodConfiguration) => (
      <RowActions>
        <Tooltip title="View details">
          <IconButton size="small" onClick={() => setViewMethod(row)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {/* Remove = disable in provider; only shown when configurable */}
        {row.configurable && (
          <RemoveButton method={row} connectionId={resolvedConnectionId} />
        )}
      </RowActions>
    ),
    [resolvedConnectionId],
  );

  const mobileCardConfig = useMemo<MobileCardConfig<PaymentMethodConfiguration>>(
    () => ({
      primaryText: 'displayName',
      secondaryText: 'id',
      badge: (row) => <PaymentMethodStatusBadge status={row.status} />,
      fields: [
        {
          field: 'type',
          label: 'Type',
          render: (v) => (
            <Chip
              label={TYPE_LABEL[v as PaymentMethodType] ?? String(v)}
              size="small"
              variant="outlined"
            />
          ),
        },
        {
          field: 'configurable',
          label: 'Configured',
          render: (v) => (v ? 'Via API' : 'Fixed'),
        },
      ],
    }),
    [],
  );

  const emptyState = (
    <EmptyState
      icon={PaymentsOutlinedIcon}
      title={
        hasActiveFilters
          ? 'No enabled methods match your filters'
          : 'No payment methods enabled'
      }
      description={
        hasActiveFilters
          ? 'Try adjusting your search or type filter.'
          : 'Use the "Add method" selector above to enable a payment method from your provider.'
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

  // ── Guard states ───────────────────────────────────────────────────────────

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
        <PageHeader title="Payment Methods" />
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
          title="Payment Methods"
          breadcrumbs={[
            { label: 'Payments', href: '/payments' },
            { label: 'Payment Methods' },
          ]}
        />
        <EmptyState
          icon={PaymentsOutlinedIcon}
          title="No payment providers configured"
          description="Configure a payment provider credential to manage payment methods."
        />
      </Box>
    );
  }

  // ── Capability guard: provider doesn't support payment methods ────────────

  if (capabilityBlocks && capabilityStatus) {
    return (
      <Box sx={{ minWidth: 0 }}>
        <PageHeader
          title="Payment Methods"
          breadcrumbs={[
            { label: 'Payments', href: '/payments' },
            { label: 'Payment Methods' },
          ]}
        />
        <PaymentsFilter />
        <ProviderFeatureUnavailable
          featureDisplayName={PAGE_FEATURE_DISPLAY_NAME.paymentMethods}
          providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey}
          status={capabilityStatus as 'planned' | 'unsupported'}
        />
      </Box>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Payment Methods"
        subtitle={pageSubtitle}
        count={resolvedConnectionId && !methodsLoading ? filtered.length : undefined}
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: 'Payment Methods' },
        ]}
      />

      {/* 1. Filter: Provider + Connection + Search + Type */}
      <PaymentsFilter>
        <TextField
          size="small"
          placeholder="Search methods…"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
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
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <Select
            value={filterType}
            displayEmpty
            onChange={(e) => {
              setFilterType(e.target.value as PaymentMethodType | '');
              setPage(0);
            }}
          >
            <MenuItem value="">
              <em>All types</em>
            </MenuItem>
            {(Object.entries(TYPE_LABEL) as [PaymentMethodType, string][]).map(
              ([val, label]) => (
                <MenuItem key={val} value={val}>
                  {label}
                </MenuItem>
              ),
            )}
          </Select>
        </FormControl>
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
          description="Select a provider and connection above to view payment methods."
        />
      )}

      {/* Provider loading */}
      {resolvedConnectionId && methodsLoading && (
        <Box display="flex" justifyContent="center" pt={4}>
          <CircularProgress />
        </Box>
      )}

      {/* Provider error — only shown when capability is available but request fails */}
      {resolvedConnectionId && methodsError && !methodsLoading && (
        <ErrorState
          title="Could not retrieve payment methods"
          description="The provider API returned an error. Check your credentials and try again."
        />
      )}

      {/* 2. Toolbar + table — only when provider data is loaded */}
      {resolvedConnectionId && !methodsLoading && !methodsError && (
        <>
          {/* 2a. Toolbar: Add method selector + provider counts */}
          <AddMethodToolbar
            allMethods={allMethods}
            connectionId={resolvedConnectionId}
          />

          {/* 2b. Table — contains ONLY enabled methods from the provider response */}
          <DataTable<PaymentMethodConfiguration>
            rows={pageRows}
            columns={columns}
            total={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={(s) => {
              setPageSize(s);
              setPage(0);
            }}
            rowActions={rowActions}
            mobileCardConfig={mobileCardConfig}
            emptyState={emptyState}
            noRowsLabel="No enabled payment methods."
            getRowId={(row) => row.id}
          />
        </>
      )}

      {/* 3. View drawer — provider info + remove action */}
      {viewMethod && (
        <MethodViewDrawer
          method={viewMethod}
          connectionId={resolvedConnectionId}
          onClose={() => setViewMethod(null)}
        />
      )}
    </Box>
  );
}
