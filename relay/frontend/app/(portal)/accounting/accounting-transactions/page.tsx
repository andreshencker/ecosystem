'use client';

// Accounting Transactions — route: /accounting/accounting-transactions
//
// Displays accounting transactions (Spend Money / Receive Money entries) for the
// selected financial account from the connected accounting provider.
//
// IMPORTANT DISTINCTION:
//   These are accounting-system records — NOT bank feed statement lines.
//   For Xero: GET /api.xro/2.0/BankTransactions (manually-created entries).
//   Bank feed activity (imported statement lines) is a separate concept and
//   may not be available through the current provider API.
//
// Xero types returned: RECEIVE, SPEND, RECEIVE-TRANSFER, SPEND-TRANSFER, etc.
// Account types supported: BANK and CREDITCARD.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
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
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import type { GridColDef } from '@mui/x-data-grid';

import { PageHeader } from '@/components/layout';
import { DataTable, EmptyState, ErrorState, FormDrawer } from '@/components/shared';
import { ProviderFeatureUnavailable } from '@/components/domain/payment/ProviderFeatureUnavailable';
import {
  useAccountingContext,
  accountingConnectionLabel,
} from '@/providers/AccountingProvider';
import { useBankAccounts, useBankTransactions } from '@/hooks/api/useAccounting';
import { extractApiMessage } from '@/lib/mapApiError';
import type { BankAccountSummary, BankTransactionSummary } from '@/types/accounting';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPABILITY_KEY   = 'bankTransactions';
const DEFAULT_PAGE_SIZE = 25;

type AccountType = 'BANK' | 'CREDITCARD';

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'BANK',       label: 'Bank Account'  },
  { value: 'CREDITCARD', label: 'Credit Card'   },
];

// ─── Formatters ───────────────────────────────────────────────────────────────

function formatMoney(amountMinor: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-AU', {
      style: 'currency', currency: currency || 'AUD', minimumFractionDigits: 2,
    }).format(amountMinor / 100);
  } catch {
    return `${(amountMinor / 100).toFixed(2)} ${currency}`;
  }
}

function maskAccountNumber(raw?: string): string {
  if (!raw) return '—';
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 0) return raw;
  if (digits.length <= 4) return `••••${digits}`;
  return `••••${digits.slice(-4)}`;
}

function accountOptionLabel(row: BankAccountSummary): string {
  const masked = maskAccountNumber(row.bankAccountNumber);
  if (masked && masked !== '—') return `${row.name} — ${masked}`;
  if (row.code) return `${row.code} — ${row.name}`;
  return row.name;
}

function formatDate(iso?: string): string {
  if (!iso) return '—';
  try {
    return new Intl.DateTimeFormat('en-AU', {
      day: '2-digit', month: 'short', year: 'numeric',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

const STATUS_LABELS: Record<string, string> = {
  authorised: 'Authorised',
  deleted:    'Deleted',
};

function statusColor(status: string): 'success' | 'error' | 'default' {
  if (status === 'authorised') return 'success';
  if (status === 'deleted')    return 'error';
  return 'default';
}

// ─── Summary counters ─────────────────────────────────────────────────────────

function SummaryCounters({ rows }: { rows: BankTransactionSummary[] }) {
  let moneyInMinor  = 0;
  let moneyOutMinor = 0;
  let currency      = '';

  for (const r of rows) {
    if (!currency && r.total.currency) currency = r.total.currency;
    if (r.direction === 'in')  moneyInMinor  += r.total.amountMinor;
    if (r.direction === 'out') moneyOutMinor += r.total.amountMinor;
  }

  const netMinor = moneyInMinor - moneyOutMinor;
  const netColor = netMinor >= 0 ? 'success.main' : 'error.main';

  const stats = [
    { label: 'Total',     value: String(rows.length),                                highlight: true },
    { label: 'Money In',  value: rows.length ? formatMoney(moneyInMinor,  currency) : '—' },
    { label: 'Money Out', value: rows.length ? formatMoney(moneyOutMinor, currency) : '—' },
    { label: 'Net',       value: rows.length ? formatMoney(netMinor,      currency) : '—', color: netColor },
  ];

  return (
    <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, mb: 1.5, overflowX: 'auto', pb: 0.5 }}>
      {stats.map(({ label, value, highlight, color }) => (
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
            color={color ?? (highlight ? 'text.primary' : 'text.secondary')}
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

function TransactionDetailDrawer({
  txn, accountName, providerDisplayName, connectionLabel, onClose,
}: {
  txn: BankTransactionSummary;
  accountName: string;
  providerDisplayName: string;
  connectionLabel: string;
  onClose: () => void;
}) {
  const isIn = txn.direction === 'in';
  return (
    <FormDrawer
      open
      onClose={onClose}
      title="Accounting Transaction Detail"
      actions={<Button variant="outlined" onClick={onClose} fullWidth>Close</Button>}
    >
      <Stack spacing={2}>
        <DrawerRow label="Provider"   value={providerDisplayName} />
        <DrawerRow label="Connection" value={connectionLabel} />
        <DrawerRow label="Account"    value={accountName} />
        <Divider />
        <DrawerRow label="Date"   value={formatDate(txn.date)} />
        <DrawerRow label="Type"   value={txn.type} />
        <DrawerRow
          label="Status"
          value={
            <Chip
              label={STATUS_LABELS[txn.status] ?? txn.status}
              color={statusColor(txn.status)}
              size="small"
              variant={txn.status === 'authorised' ? 'filled' : 'outlined'}
            />
          }
        />
        <Divider />
        {txn.contactName && <DrawerRow label="Contact / Payee" value={txn.contactName} />}
        {txn.description  && <DrawerRow label="Description"    value={txn.description} />}
        <DrawerRow label="Reference" value={txn.reference ?? '—'} />
        <Divider />
        <DrawerRow
          label={isIn ? 'Amount (Money In)' : 'Amount (Money Out)'}
          value={
            <Typography variant="body2" fontWeight={600} color={isIn ? 'success.main' : 'error.main'}>
              {formatMoney(txn.total.amountMinor, txn.total.currency)}
            </Typography>
          }
        />
        <DrawerRow label="Currency" value={txn.total.currency?.toUpperCase() ?? '—'} />
        {txn.isReconciled !== undefined && (
          <DrawerRow label="Reconciled in Provider" value={txn.isReconciled ? 'Yes' : 'No'} />
        )}
        <Divider />
        <DrawerRow
          label="Provider Transaction ID"
          value={
            <Typography variant="body2" fontFamily="monospace" sx={{ wordBreak: 'break-all' }}>
              {txn.id}
            </Typography>
          }
        />
      </Stack>
    </FormDrawer>
  );
}

// ─── Table columns ────────────────────────────────────────────────────────────

function buildColumns(): GridColDef<BankTransactionSummary>[] {
  return [
    {
      field: 'date',
      headerName: 'Date',
      flex: 1,
      minWidth: 110,
      renderCell: ({ row }) => (
        <Typography variant="body2" color="text.secondary">{formatDate(row.date)}</Typography>
      ),
    },
    {
      field: '_desc',
      headerName: 'Description / Contact',
      flex: 3,
      minWidth: 180,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack spacing={0} justifyContent="center" sx={{ py: 0.5 }}>
          {row.contactName && (
            <Typography variant="body2" fontWeight={500} noWrap>{row.contactName}</Typography>
          )}
          {row.description && (
            <Typography variant="caption" color="text.secondary" noWrap>
              {row.description}
            </Typography>
          )}
          {!row.contactName && !row.description && (
            <Typography variant="body2" color="text.disabled">—</Typography>
          )}
        </Stack>
      ),
    },
    {
      field: 'reference',
      headerName: 'Reference',
      flex: 1,
      minWidth: 110,
      renderCell: ({ value }) => (
        <Typography variant="body2" color="text.secondary" noWrap>
          {(value as string | undefined) ?? '—'}
        </Typography>
      ),
    },
    {
      field: '_moneyIn',
      headerName: 'Money In',
      flex: 1,
      minWidth: 100,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) =>
        row.direction === 'in' ? (
          <Typography variant="body2" fontWeight={500} color="success.main">
            {formatMoney(row.total.amountMinor, row.total.currency)}
          </Typography>
        ) : null,
    },
    {
      field: '_moneyOut',
      headerName: 'Money Out',
      flex: 1,
      minWidth: 100,
      sortable: false,
      align: 'right',
      headerAlign: 'right',
      renderCell: ({ row }) =>
        row.direction === 'out' ? (
          <Typography variant="body2" fontWeight={500} color="error.main">
            {formatMoney(row.total.amountMinor, row.total.currency)}
          </Typography>
        ) : null,
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: ({ row }) => (
        <Chip
          label={STATUS_LABELS[row.status] ?? row.status}
          color={statusColor(row.status)}
          size="small"
          variant={row.status === 'authorised' ? 'filled' : 'outlined'}
        />
      ),
    },
  ];
}

// ─── Error classifier ─────────────────────────────────────────────────────────

function classifyTxnError(err: Error): { title: string; description: string; showCredLink: boolean } {
  const msg = extractApiMessage(err, '');
  const lower = msg.toLowerCase();
  if (lower.includes('scope') || lower.includes('banktransactions') ||
      lower.includes('unauthori') || lower.includes('token')) {
    return {
      title: 'OAuth scope required',
      description:
        'This connection was authorised without the accounting.banktransactions.read scope. ' +
        'Reconnect via Provider Credentials and authorise the transactions scope.',
      showCredLink: true,
    };
  }
  if (lower.includes('tenant') || lower.includes('organisation') || lower.includes('oauth')) {
    return {
      title: 'Connection not authorised',
      description: 'The OAuth flow has not been completed. Open Provider Credentials and connect.',
      showCredLink: true,
    };
  }
  return {
    title: 'Could not load accounting transactions',
    description: msg || 'The provider returned an error. Check the connection and try again.',
    showCredLink: false,
  };
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AccountingTransactionsPage() {
  const {
    availableProviderOptions, providersLoading, providersError,
    selectedProviderId, setSelectedProviderId, resolvedProviderId, selectedProvider,
    resolvedProviderKey, capabilitiesLoading, getCapabilityStatus,
    availableConnections, connectionsLoading, connectionsError,
    selectedConnectionId, setSelectedConnectionId, resolvedConnectionId, selectedConnection,
  } = useAccountingContext();

  // ── Account type (BANK / CREDITCARD) ─────────────────────────────────────

  const [accountType, setAccountType] = useState<AccountType>('BANK');

  // ── Filter state ──────────────────────────────────────────────────────────

  const [selectedAccount, setSelectedAccount] = useState<BankAccountSummary | null>(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo,   setDateTo]   = useState('');
  const [statusFilter, setStatusFilter] = useState<'authorised' | 'deleted' | 'all'>('authorised');
  const [page,     setPage]     = useState(0);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  const [viewTxn, setViewTxn] = useState<BankTransactionSummary | null>(null);

  // ── Selection handlers ────────────────────────────────────────────────────

  const handleProviderChange = useCallback((ccpId: string) => {
    setSelectedProviderId(ccpId);
    setSelectedAccount(null);
    setPage(0);
  }, [setSelectedProviderId]);

  const handleConnectionChange = useCallback((id: string) => {
    setSelectedConnectionId(id);
    setSelectedAccount(null);
    setPage(0);
  }, [setSelectedConnectionId]);

  const handleAccountTypeChange = useCallback((type: AccountType) => {
    setAccountType(type);
    setSelectedAccount(null);  // clear account — different account type list
    setPage(0);
  }, []);

  const handleAccountChange = useCallback((acct: BankAccountSummary | null) => {
    setSelectedAccount(acct);
    setPage(0);
  }, []);

  // ── Capability gate ───────────────────────────────────────────────────────

  const capabilityStatus = getCapabilityStatus(CAPABILITY_KEY);
  const enabled = Boolean(resolvedConnectionId) && capabilityStatus === 'available';

  // ── Load financial accounts ───────────────────────────────────────────────

  const {
    data: accountsData,
    isLoading: accountsLoading,
    error: accountsError,
  } = useBankAccounts(
    resolvedConnectionId || null,
    { limit: 100, accountType },
    { enabled },
  );
  const accounts = useMemo<BankAccountSummary[]>(() => accountsData?.data ?? [], [accountsData]);

  // Auto-select when exactly one account is available
  useEffect(() => {
    if (accounts.length === 1 && selectedAccount === null) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  // ── Load accounting transactions ──────────────────────────────────────────

  const txnParams = useMemo(() => ({
    dateFrom:  dateFrom  || undefined,
    dateTo:    dateTo    || undefined,
    status:    statusFilter,
  }), [dateFrom, dateTo, statusFilter]);

  const {
    data: txnData,
    isLoading: txnLoading,
    error: txnError,
    refetch,
  } = useBankTransactions(
    resolvedConnectionId || null,
    selectedAccount?.id ?? null,
    txnParams,
    { enabled: enabled && Boolean(selectedAccount) },
  );

  const allRows  = useMemo<BankTransactionSummary[]>(() => txnData?.data ?? [], [txnData]);
  const hasMore  = txnData?.hasMore ?? false;
  const paginatedRows = useMemo(
    () => allRows.slice(page * pageSize, (page + 1) * pageSize),
    [allRows, page, pageSize],
  );

  const columns = useMemo(() => buildColumns(), []);

  // ── Derived flags ─────────────────────────────────────────────────────────

  const noProviders   = !providersLoading && !providersError && availableProviderOptions.length === 0;
  const noConnections = !connectionsLoading && !connectionsError &&
    Boolean(resolvedProviderId) && availableConnections.length === 0;
  const providerValue   = resolvedProviderId || selectedProviderId || '';
  const connectionValue = resolvedConnectionId || selectedConnectionId || '';
  const showConnections = Boolean(resolvedProviderId) && availableConnections.length > 0;
  const connectionLabel = selectedConnection
    ? accountingConnectionLabel(selectedConnection)
    : (resolvedProviderKey ?? '');

  const AccountIcon = accountType === 'CREDITCARD' ? CreditCardOutlinedIcon : AccountBalanceOutlinedIcon;
  const accountLabel = accountType === 'CREDITCARD' ? 'Credit Card' : 'Bank Account';

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Accounting Transactions"
        subtitle="View accounting transactions from your connected provider."
      />

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <Paper
        variant="outlined"
        sx={{ p: 1, mb: 1.5, borderRadius: 2, overflow: 'auto' }}
        data-testid="accounting-transactions-toolbar"
      >
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

          {/* Account Type */}
          <TextField
            select label="Account Type" size="small"
            value={accountType}
            onChange={(e) => handleAccountTypeChange(e.target.value as AccountType)}
            disabled={!enabled}
            sx={{ width: 140 }}
            inputProps={{ 'data-testid': 'account-type-select' }}
          >
            {ACCOUNT_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>

          {/* Account */}
          <Autocomplete<BankAccountSummary>
            options={accounts}
            getOptionLabel={accountOptionLabel}
            value={selectedAccount}
            onChange={(_, value) => handleAccountChange(value)}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            disabled={!enabled || accountsLoading}
            size="small"
            sx={{ width: 240 }}
            renderInput={(params) => (
              <TextField {...params} label={accountLabel} placeholder={`Search ${accountLabel.toLowerCase()}…`} size="small" />
            )}
          />

          {/* Date From */}
          <TextField
            label="From" type="date" size="small"
            value={dateFrom}
            onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
            disabled={!enabled || !selectedAccount}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />

          {/* Date To */}
          <TextField
            label="To" type="date" size="small"
            value={dateTo}
            onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
            disabled={!enabled || !selectedAccount}
            InputLabelProps={{ shrink: true }}
            sx={{ width: 150 }}
          />

          {/* Status */}
          <TextField
            select label="Status" size="small"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(0); }}
            disabled={!enabled || !selectedAccount}
            sx={{ width: 130 }}
          >
            <MenuItem value="authorised">Authorised</MenuItem>
            <MenuItem value="deleted">Deleted</MenuItem>
            <MenuItem value="all">All</MenuItem>
          </TextField>

          <Box sx={{ flexGrow: 1, minWidth: 8 }} />

          <Button
            size="small" variant="outlined"
            startIcon={<RefreshOutlinedIcon />}
            onClick={() => refetch()}
            disabled={!enabled || !selectedAccount || txnLoading}
            sx={{ flexShrink: 0 }}
          >
            Refresh
          </Button>
        </Box>
      </Paper>

      {/* ── Provider / connection errors ────────────────────────────────── */}
      {providersError && (
        <ErrorState title="Could not load accounting providers" description={extractApiMessage(providersError, 'Check your connection and try again.')} />
      )}
      {noProviders && !providersError && (
        <EmptyState
          icon={HubOutlinedIcon}
          title="No accounting providers configured"
          description="Enable Xero (or another accounting provider) for your company, then add OAuth credentials."
          action={<Button component={Link} href="/provider-credentials" variant="contained" startIcon={<HubOutlinedIcon />}>Go to Credentials</Button>}
        />
      )}
      {noConnections && !connectionsError && (
        <EmptyState
          icon={VpnKeyOutlinedIcon}
          title="No active connections"
          description={`No active ${selectedProvider?.displayName ?? 'accounting'} connections found. Add credentials and complete OAuth.`}
          action={<Button component={Link} href="/provider-credentials" variant="contained" startIcon={<LinkOutlinedIcon />}>Go to Provider Credentials</Button>}
        />
      )}
      {connectionsError && (
        <Alert severity="error" sx={{ mb: 2 }}>{extractApiMessage(connectionsError, 'Could not load connections.')}</Alert>
      )}

      {/* ── Capability loading ───────────────────────────────────────────── */}
      {Boolean(resolvedConnectionId) && capabilitiesLoading && (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      )}

      {/* ── Capability gate ──────────────────────────────────────────────── */}
      {Boolean(resolvedConnectionId) && !capabilitiesLoading && capabilityStatus !== 'available' && (
        <ProviderFeatureUnavailable
          featureDisplayName="Accounting Transactions"
          providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey ?? 'Provider'}
          status={capabilityStatus as 'planned' | 'unsupported' ?? 'unsupported'}
        />
      )}

      {/* ── Transaction content ─────────────────────────────────────────── */}
      {enabled && (
        <>
          {accountsError && !accountsLoading && (() => {
            const msg = extractApiMessage(accountsError, 'The provider returned an error. Check the connection and try again.');
            const isOAuthIncomplete =
              msg.toLowerCase().includes('oauth') ||
              msg.toLowerCase().includes('tenant') ||
              msg.toLowerCase().includes('organisation') ||
              msg.toLowerCase().includes('scope');
            return (
              <ErrorState
                title={isOAuthIncomplete ? 'Connection not authorised' : 'Could not load financial accounts'}
                description={
                  isOAuthIncomplete
                    ? 'The Xero OAuth flow has not been completed, or the selected organisation is no longer available. Open Provider Credentials and reconnect.'
                    : msg
                }
                action={isOAuthIncomplete ? (
                  <Button component={Link} href="/provider-credentials" variant="outlined" startIcon={<OpenInNewOutlinedIcon />}>
                    Open Provider Credentials
                  </Button>
                ) : undefined}
              />
            );
          })()}

          {!accountsError && !accountsLoading && accounts.length === 0 && (
            <EmptyState
              icon={AccountIcon}
              title={`No ${accountLabel.toLowerCase()}s available`}
              description={`No ${accountLabel.toLowerCase()}s were found for this connection. Add one in your accounting provider.`}
            />
          )}

          {!selectedAccount && accounts.length > 1 && !txnError && (
            <EmptyState
              icon={AccountIcon}
              title={`Select a ${accountLabel.toLowerCase()}`}
              description={`Choose a ${accountLabel.toLowerCase()} from the filter above to view its accounting transactions.`}
            />
          )}

          {selectedAccount && txnError && !txnLoading && (() => {
            const { title, description, showCredLink } = classifyTxnError(txnError);
            return (
              <ErrorState
                title={title}
                description={description}
                action={showCredLink ? (
                  <Button component={Link} href="/provider-credentials" variant="outlined" startIcon={<OpenInNewOutlinedIcon />}>
                    Open Provider Credentials
                  </Button>
                ) : undefined}
              />
            );
          })()}

          {selectedAccount && !txnError && (
            <>
              <SummaryCounters rows={allRows} />

              {hasMore && !txnLoading && (
                <Alert severity="info" sx={{ mb: 1.5 }}>
                  Showing the first 100 accounting transactions. Narrow the date range to see fewer results.
                </Alert>
              )}

              <DataTable<BankTransactionSummary>
                columns={columns}
                rows={paginatedRows}
                total={allRows.length}
                page={page}
                pageSize={pageSize}
                onPageChange={setPage}
                onPageSizeChange={(size) => { setPageSize(size); setPage(0); }}
                onRowClick={(row) => setViewTxn(row)}
                loading={txnLoading}
                getRowId={(row) => row.id}
                tableHeight="calc(100vh - 400px)"
                emptyState={
                  <EmptyState
                    icon={ReceiptLongOutlinedIcon}
                    title="No accounting transactions found"
                    description={
                      dateFrom || dateTo
                        ? 'No accounting transactions match the selected date range. Adjust the From / To filters.'
                        : 'No accounting transactions are available for this account. Bank feed activity may exist separately and may not be available through the current provider API.'
                    }
                    data-testid="no-accounting-transactions-empty"
                  />
                }
                mobileCardConfig={{
                  primaryText: (row) => row.contactName ?? row.description ?? '—',
                  secondaryText: (row) => [formatDate(row.date), formatMoney(row.total.amountMinor, row.total.currency)].filter(Boolean).join(' · '),
                  badge: (row) => (
                    <Chip
                      label={STATUS_LABELS[row.status] ?? row.status}
                      color={statusColor(row.status)}
                      size="small"
                      variant={row.status === 'authorised' ? 'filled' : 'outlined'}
                    />
                  ),
                  fields: [],
                }}
              />
            </>
          )}
        </>
      )}

      {viewTxn && (
        <TransactionDetailDrawer
          txn={viewTxn}
          accountName={selectedAccount?.name ?? ''}
          providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey ?? ''}
          connectionLabel={connectionLabel}
          onClose={() => setViewTxn(null)}
        />
      )}
    </>
  );
}
