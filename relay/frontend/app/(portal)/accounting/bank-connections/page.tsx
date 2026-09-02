'use client';

// Bank Connections — route: /accounting/bank-connections
//
// Lists all financial accounts (bank accounts AND credit cards) available
// through the selected accounting provider connection.
//
// Conceptually equivalent to Xero's "Bank Accounts" page — shows every
// financial account in the organisation, regardless of sub-type.
//
// Data source: GET /accounting/banking/:credentialId/accounts (no accountType
// filter — backend returns all Type=BANK accounts from Xero, covering both
// BankAccountType=BANK and BankAccountType=CREDITCARD).
//
// Balance data (Balance in Xero, Statement Balance) is not included in the
// list endpoint. Both columns display "—" unless a future list API provides
// this data. Balances must never be fabricated or inferred.
//
// Provider/connection context is managed by AccountingProvider (layout.tsx).

import React, { useState, useCallback, useMemo } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import type { GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '@/components/layout';
import {
  DataTable,
  EmptyState,
  ErrorState,
  FormDrawer,
} from '@/components/shared';
import { ProviderFeatureUnavailable } from '@/components/domain/payment/ProviderFeatureUnavailable';
import {
  useAccountingContext,
  accountingConnectionLabel,
} from '@/providers/AccountingProvider';
import {
  useBankAccounts,
  useBankAccount,
} from '@/hooks/api/useAccounting';
import { extractApiMessage } from '@/lib/mapApiError';
import type { BankAccountSummary } from '@/types/accounting';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPABILITY_KEY    = 'banking';
const MAX_LIMIT         = 100;
const DEFAULT_PAGE_SIZE = 25;

// ─── Money formatter ──────────────────────────────────────────────────────────

function formatMoney(money?: { amountMinor: number; currency: string }): string {
  if (!money) return '—';
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency',
      currency: money.currency || 'AUD',
      minimumFractionDigits: 2,
    }).format(money.amountMinor / 100);
  } catch {
    return `${(money.amountMinor / 100).toFixed(2)} ${money.currency}`;
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function maskAccountNumber(raw?: string): string {
  if (!raw) return '—';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return raw;
  if (digits.length <= 4) return `••••${digits}`;
  return `••••${digits.slice(-4)}`;
}

function isRowActive(row: BankAccountSummary): boolean {
  if (row.status !== undefined) return row.status === 'active';
  return row.isActive ?? true;
}

// Normalised display labels for Xero BankAccountType values.
// 'BANK'       → Bank Account
// 'CREDITCARD' → Credit Card
// 'PAYPAL'     → PayPal
const BANK_TYPE_LABELS: Record<string, string> = {
  BANK:       'Bank Account',
  CREDITCARD: 'Credit Card',
  PAYPAL:     'PayPal',
};

function bankTypeLabel(type?: string): string {
  if (!type) return '—';
  return BANK_TYPE_LABELS[type.toUpperCase()] ?? type;
}

// ─── Summary counters ─────────────────────────────────────────────────────────

function SummaryCounters({ rows }: { rows: BankAccountSummary[] }) {
  let active   = 0;
  let archived = 0;
  let banks    = 0;
  let cards    = 0;
  for (const r of rows) {
    if (isRowActive(r)) active++; else archived++;
    const t = r.type?.toUpperCase();
    if (t === 'BANK')       banks++;
    if (t === 'CREDITCARD') cards++;
  }
  const stats = [
    { label: 'Total',        value: rows.length, highlight: true },
    { label: 'Active',       value: active },
    { label: 'Bank Accts',   value: banks },
    { label: 'Credit Cards', value: cards },
    { label: 'Archived',     value: archived },
  ];
  return (
    <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, mb: 1.5, overflowX: 'auto', pb: 0.5 }}>
      {stats.map(({ label, value, highlight }) => (
        <Box
          key={label}
          sx={{
            border: '1px solid', borderColor: 'divider', borderRadius: 1,
            px: 1.5, py: 0.5, display: 'flex', alignItems: 'center',
            gap: 0.75, flexShrink: 0,
            bgcolor: highlight ? 'action.hover' : 'background.paper',
          }}
        >
          <Typography variant="caption" color="text.secondary" noWrap>{label}</Typography>
          <Typography
            variant="body2"
            fontWeight={highlight ? 700 : 600}
            color={highlight ? 'text.primary' : 'text.secondary'}
          >
            {value}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// ─── Detail drawer ────────────────────────────────────────────────────────────

function DrawerRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <Box>
      <Typography variant="caption" color="text.secondary" display="block" mb={0.25}>
        {label}
      </Typography>
      <Typography variant="body2" component="div">{value}</Typography>
    </Box>
  );
}

function BankConnectionDetailDrawer({
  credentialId,
  accountId,
  providerDisplayName,
  connectionLabel,
  onClose,
}: {
  credentialId: string;
  accountId: string;
  providerDisplayName: string;
  connectionLabel: string;
  onClose: () => void;
}) {
  const { data, isLoading, error } = useBankAccount(credentialId, accountId);

  const active = data ? data.isActive : undefined;

  return (
    <FormDrawer
      open
      onClose={onClose}
      title="Financial Account Detail"
      actions={
        <Button variant="outlined" onClick={onClose} fullWidth>
          Close
        </Button>
      }
    >
      {isLoading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress size={24} />
        </Box>
      )}
      {error && !isLoading && (
        <Alert severity="error">
          {extractApiMessage(error, 'Could not load account detail.')}
        </Alert>
      )}
      {data && !isLoading && (
        <Stack spacing={2}>
          <DrawerRow label="Provider"   value={providerDisplayName} />
          <DrawerRow label="Connection" value={connectionLabel} />

          <Divider />

          {/* Institution — Xero Accounts API does not expose institution name */}
          <DrawerRow label="Institution" value="—" />

          <Divider />

          <DrawerRow label="Account Name" value={data.name} />
          <DrawerRow
            label="Account Number"
            value={
              data.bankAccountNumber
                ? maskAccountNumber(data.bankAccountNumber)
                : <Typography variant="body2" color="text.disabled" component="span">Not available</Typography>
            }
          />
          <DrawerRow label="Type"     value={bankTypeLabel(data.bankAccountType)} />
          <DrawerRow label="Currency" value={data.currency?.toUpperCase() ?? '—'} />
          <DrawerRow label="Code"     value={data.code ?? '—'} />
          <DrawerRow
            label="Status"
            value={
              <Chip
                label={active ? 'Active' : 'Archived'}
                color={active ? 'success' : 'default'}
                size="small"
                variant={active ? 'filled' : 'outlined'}
              />
            }
          />

          {data.description && (
            <>
              <Divider />
              <DrawerRow label="Description" value={data.description} />
            </>
          )}
          {data.enablePaymentsToAccount !== undefined && (
            <DrawerRow
              label="Payments to Account"
              value={data.enablePaymentsToAccount ? 'Enabled' : 'Disabled'}
            />
          )}

          <Divider />

          {/* Balance in Xero — not exposed by single-account detail endpoint;
              available in list via BankSummary (withBalances=true). */}
          <DrawerRow label="Balance in Xero" value="—" />
        </Stack>
      )}
    </FormDrawer>
  );
}

// ─── Table columns ─────────────────────────────────────────────────────────────
//
// ACCOUNT         — name + masked account number
// TYPE            — normalised: Bank Account | Credit Card | PayPal
// CURRENCY        — from provider
// BALANCE IN XERO — Closing Balance from BankSummary when Xero has transactions;
//                   "—" otherwise (no data fabricated)
// STATUS          — Active / Archived from provider
//
// Statement Balance is omitted: BankSummary does not expose the bank-feed
// reconciliation balance. Last Sync is omitted: no sync timestamp from provider.

function buildColumns(): GridColDef<BankAccountSummary>[] {
  return [
    {
      field: 'name',
      headerName: 'Account',
      flex: 3,
      minWidth: 180,
      renderCell: ({ row }) => (
        <Stack spacing={0} justifyContent="center" sx={{ py: 0.5 }}>
          <Typography variant="body2" fontWeight={500} noWrap>
            {row.name}
          </Typography>
          {row.bankAccountNumber && (
            <Typography
              variant="caption"
              color="text.secondary"
              fontFamily="monospace"
              noWrap
            >
              {maskAccountNumber(row.bankAccountNumber)}
            </Typography>
          )}
        </Stack>
      ),
    },
    {
      field: 'type',
      headerName: 'Type',
      flex: 1.5,
      minWidth: 120,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary">
          {bankTypeLabel(row.type)}
        </Typography>
      ),
    },
    {
      field: 'currency',
      headerName: 'Currency',
      flex: 0.8,
      minWidth: 80,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary">
          {row.currency?.toUpperCase() ?? '—'}
        </Typography>
      ),
    },
    {
      field: '_xeroBalance',
      headerName: 'Balance in Xero',
      flex: 1.5,
      minWidth: 130,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      // Sourced from GET /Reports/BankSummary — "Balance in Xero" column.
      // This is the accounting system's own balance, calculated from recorded
      // transactions. Distinct from Statement Balance (bank-originated feed).
      renderCell: ({ row }) => (
        <Typography
          variant="body2"
          color={row.xeroBalance ? 'text.primary' : 'text.disabled'}
          fontFamily={row.xeroBalance ? 'monospace' : undefined}
        >
          {formatMoney(row.xeroBalance)}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      flex: 1,
      minWidth: 100,
      renderCell: ({ row }) => {
        const active = isRowActive(row);
        return (
          <Chip
            label={active ? 'Active' : 'Archived'}
            color={active ? 'success' : 'default'}
            size="small"
            variant={active ? 'filled' : 'outlined'}
          />
        );
      },
    },
  ];
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BankConnectionsPage() {
  const {
    availableProviderOptions, providersLoading, providersError,
    selectedProviderId, setSelectedProviderId, resolvedProviderId, selectedProvider,
    resolvedProviderKey, capabilitiesLoading, getCapabilityStatus,
    availableConnections, connectionsLoading, connectionsError,
    selectedConnectionId, setSelectedConnectionId, resolvedConnectionId, selectedConnection,
  } = useAccountingContext();

  // ── Filter state ──────────────────────────────────────────────────────────

  const [statusFilter, setStatusFilter] = useState<'active' | 'archived' | 'all'>('active');
  const [page,     setPage]     = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  // ── View state ────────────────────────────────────────────────────────────

  const [viewAccountId, setViewAccountId] = useState<string | null>(null);

  // ── Selection handlers ────────────────────────────────────────────────────

  const handleProviderChange = useCallback((ccpId: string) => {
    setSelectedProviderId(ccpId);
    setPage(0);
    setStatusFilter('active');
    setViewAccountId(null);
  }, [setSelectedProviderId]);

  const handleConnectionChange = useCallback((id: string) => {
    setSelectedConnectionId(id);
    setPage(0);
    setViewAccountId(null);
  }, [setSelectedConnectionId]);

  // ── Capability ────────────────────────────────────────────────────────────

  const capabilityStatus = getCapabilityStatus(CAPABILITY_KEY);
  const bankingEnabled   = Boolean(resolvedConnectionId) && capabilityStatus === 'available';

  // ── Data ──────────────────────────────────────────────────────────────────
  //
  // No accountType filter — returns ALL financial accounts (BANK + CREDITCARD).
  // withBalances=true triggers one parallel BankSummary call on the backend;
  // the single report covers all accounts — no N+1 calls.

  const includeArchived = statusFilter !== 'active';

  const {
    data: rawData, isLoading: accountsLoading, error: accountsError, refetch,
  } = useBankAccounts(
    resolvedConnectionId || null,
    { limit: MAX_LIMIT, includeArchived, withBalances: true },
    { enabled: bankingEnabled },
  );

  const allRows = useMemo<BankAccountSummary[]>(() => rawData?.data ?? [], [rawData]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'archived') return allRows.filter((r) => !isRowActive(r));
    return allRows;
  }, [allRows, statusFilter]);

  const paginatedRows = useMemo(
    () => filteredRows.slice(page * pageSize, (page + 1) * pageSize),
    [filteredRows, page, pageSize],
  );

  const columns = useMemo(() => buildColumns(), []);

  // ── Derived flags ─────────────────────────────────────────────────────────

  const noProviders =
    !providersLoading && !providersError && availableProviderOptions.length === 0;
  const noConnections =
    !connectionsLoading && !connectionsError &&
    Boolean(resolvedProviderId) && availableConnections.length === 0;

  const providerValue   = resolvedProviderId || selectedProviderId || '';
  const connectionValue = resolvedConnectionId || selectedConnectionId || '';
  const showConnections = Boolean(resolvedProviderId) && availableConnections.length > 0;

  const connectionLabel = selectedConnection
    ? accountingConnectionLabel(selectedConnection)
    : (resolvedProviderKey ?? '');

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Bank Connections"
        subtitle="Financial accounts (bank accounts and credit cards) available through the selected accounting provider."
      />

      {/* ── Toolbar: Provider | Connection | Status | Refresh ──────────────── */}
      <Paper variant="outlined" sx={{ p: 1, mb: 1.5, borderRadius: 2, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, alignItems: 'center', minWidth: 'max-content' }}>

          {/* Provider */}
          <TextField
            select label="Provider" size="small"
            value={providerValue}
            onChange={(e) => handleProviderChange(e.target.value)}
            disabled={providersLoading || availableProviderOptions.length === 0}
            SelectProps={{ displayEmpty: true }}
            sx={{ width: 150 }}
          >
            {availableProviderOptions.length === 0 && (
              <MenuItem value="" disabled>
                {providersLoading ? 'Loading…' : 'None configured'}
              </MenuItem>
            )}
            {availableProviderOptions.map((p) => (
              <MenuItem key={p.ccpId} value={p.ccpId}>{p.displayName}</MenuItem>
            ))}
          </TextField>

          {/* Connection */}
          {showConnections && (
            <TextField
              select label="Connection" size="small"
              value={connectionValue}
              onChange={(e) => handleConnectionChange(e.target.value)}
              sx={{ width: 200 }}
            >
              {availableConnections.map((c) => (
                <MenuItem key={c.id} value={c.id}>{accountingConnectionLabel(c)}</MenuItem>
              ))}
            </TextField>
          )}

          {/* Status */}
          <TextField
            select label="Status" size="small"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value as typeof statusFilter);
              setPage(0);
            }}
            disabled={!bankingEnabled}
            sx={{ width: 130 }}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="archived">Archived</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </TextField>

          <Box sx={{ flexGrow: 1, minWidth: 8 }} />

          <Button
            size="small" variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            onClick={() => refetch()}
            disabled={!bankingEnabled || accountsLoading}
            sx={{ flexShrink: 0 }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* ── Provider / connection errors ────────────────────────────────────── */}
      {providersError && (
        <ErrorState
          title="Could not load accounting providers"
          description={extractApiMessage(providersError, 'Check your connection and try again.')}
        />
      )}
      {noProviders && !providersError && (
        <EmptyState
          icon={HubOutlinedIcon}
          title="No accounting providers configured"
          description="Enable Xero (or another accounting provider) for your company, then add OAuth credentials."
          action={
            <Button
              component={Link}
              href="/provider-credentials"
              variant="contained"
              startIcon={<HubOutlinedIcon />}
            >
              Go to Credentials
            </Button>
          }
        />
      )}
      {noConnections && !connectionsError && (
        <EmptyState
          icon={VpnKeyOutlinedIcon}
          title="No active connections"
          description={`No active ${selectedProvider?.displayName ?? 'accounting'} connections found. Add credentials and complete OAuth.`}
          action={
            <Button
              component={Link}
              href="/provider-credentials"
              variant="contained"
              startIcon={<LinkOutlinedIcon />}
            >
              Go to Provider Credentials
            </Button>
          }
        />
      )}
      {connectionsError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {extractApiMessage(connectionsError, 'Could not load connections.')}
        </Alert>
      )}

      {/* ── Capability loading ──────────────────────────────────────────────── */}
      {Boolean(resolvedConnectionId) && capabilitiesLoading && (
        <Box display="flex" justifyContent="center" py={4}>
          <CircularProgress />
        </Box>
      )}

      {/* ── Capability gate ─────────────────────────────────────────────────── */}
      {Boolean(resolvedConnectionId) && !capabilitiesLoading && (
        <>
          {capabilityStatus === 'planned' && (
            <ProviderFeatureUnavailable
              featureDisplayName="Bank Connections"
              providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey}
              status="planned"
            />
          )}
          {capabilityStatus === 'unsupported' && (
            <ProviderFeatureUnavailable
              featureDisplayName="Bank Connections"
              providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey}
              status="unsupported"
            />
          )}
        </>
      )}

      {/* ── Financial accounts list ─────────────────────────────────────────── */}
      {bankingEnabled && (
        <>
          {accountsError && !accountsLoading && (() => {
            const msg = extractApiMessage(
              accountsError,
              'The provider returned an error. Check the connection and try again.',
            );
            const isOAuthIncomplete =
              msg.toLowerCase().includes('oauth') ||
              msg.toLowerCase().includes('tenant') ||
              msg.toLowerCase().includes('organisation');
            return (
              <ErrorState
                title={isOAuthIncomplete ? 'Connection not authorised' : 'Could not load financial accounts'}
                description={
                  isOAuthIncomplete
                    ? 'The Xero OAuth flow has not been completed. Open Provider Credentials and click "Connect with Xero".'
                    : msg
                }
                action={isOAuthIncomplete ? (
                  <Button
                    component={Link}
                    href="/provider-credentials"
                    variant="outlined"
                    startIcon={<OpenInNewOutlinedIcon />}
                  >
                    Open Provider Credentials
                  </Button>
                ) : undefined}
              />
            );
          })()}

          {!accountsError && <SummaryCounters rows={allRows} />}

          {!accountsError && (
            <DataTable<BankAccountSummary>
              columns={columns}
              rows={paginatedRows}
              total={filteredRows.length}
              page={page}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
              onRowClick={(row) => setViewAccountId(row.id)}
              loading={accountsLoading}
              getRowId={(row) => row.id}
              tableHeight="calc(100vh - 360px)"
              emptyState={
                <EmptyState
                  icon={AccountBalanceOutlinedIcon}
                  title="No financial accounts found"
                  description="No bank accounts or credit cards are currently available for this provider connection."
                />
              }
              mobileCardConfig={{
                primaryText: (row) =>
                  `${row.name}${row.bankAccountNumber ? ` — ${maskAccountNumber(row.bankAccountNumber)}` : ''}`,
                secondaryText: (row) =>
                  [bankTypeLabel(row.type), row.currency?.toUpperCase()]
                    .filter((v) => v && v !== '—')
                    .join(' · '),
                badge: (row) => {
                  const active = isRowActive(row);
                  return (
                    <Chip
                      label={active ? 'Active' : 'Archived'}
                      color={active ? 'success' : 'default'}
                      size="small"
                      variant={active ? 'filled' : 'outlined'}
                    />
                  );
                },
                fields: [],
              }}
            />
          )}
        </>
      )}

      {/* ── Detail drawer ──────────────────────────────────────────────────── */}
      {viewAccountId && resolvedConnectionId && (
        <BankConnectionDetailDrawer
          credentialId={resolvedConnectionId}
          accountId={viewAccountId}
          providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey ?? ''}
          connectionLabel={connectionLabel}
          onClose={() => setViewAccountId(null)}
        />
      )}
    </>
  );
}
