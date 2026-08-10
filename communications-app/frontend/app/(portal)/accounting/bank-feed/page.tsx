'use client';

// Bank Feed — route: /accounting/bank-feed
//
// Represents bank-originated activity: statement lines imported from a
// financial institution into the accounting provider.
//
// DISTINCTION:
//   Bank Feed = what the BANK reports (statement lines, imported transactions).
//   Accounting Transactions = what the ACCOUNTING SYSTEM records (manually created).
//   These are different resources. Do not conflate them.
//
// CURRENT PROVIDER LIMITATION (Xero):
//   Standard Xero Accounting API does not expose unreconciled bank statement lines.
//   This page is capability-driven. If the provider declares bankFeed as planned
//   or unsupported, the appropriate state is shown — no fake data is rendered.

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import AccountBalanceOutlinedIcon from '@mui/icons-material/AccountBalanceOutlined';
import CreditCardOutlinedIcon from '@mui/icons-material/CreditCardOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';
import AccountBalanceWalletOutlinedIcon from '@mui/icons-material/AccountBalanceWalletOutlined';

import { PageHeader } from '@/components/layout';
import { EmptyState, ErrorState } from '@/components/shared';
import {
  useAccountingContext,
  accountingConnectionLabel,
} from '@/providers/AccountingProvider';
import { useBankAccounts } from '@/hooks/api/useAccounting';
import { extractApiMessage } from '@/lib/mapApiError';
import type { BankAccountSummary } from '@/types/accounting';

// ─── Constants ────────────────────────────────────────────────────────────────

export const CAPABILITY_KEY = 'bankFeed';

type AccountType = 'BANK' | 'CREDITCARD';

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string }[] = [
  { value: 'BANK',       label: 'Bank Account' },
  { value: 'CREDITCARD', label: 'Credit Card'  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// ─── Provider limitation panel ────────────────────────────────────────────────

function BankFeedLimitationPanel({
  providerDisplayName,
  accountName,
}: {
  providerDisplayName: string;
  accountName?: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 3, mt: 1 }}
      data-testid="bank-feed-limitation-panel"
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <InfoOutlinedIcon sx={{ color: 'info.main', mt: 0.25, flexShrink: 0 }} />
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" fontWeight={600}>
            Bank Feed Unavailable via Current API
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Bank feed activity is managed by {providerDisplayName} for
            {accountName ? ` ${accountName}` : ' this account'}.
            Unreconciled bank statement lines are not available through the
            current {providerDisplayName} Accounting API.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            The standard {providerDisplayName} Accounting API provides access to accounting
            transactions (manually created Spend/Receive Money entries) but does not expose
            the bank statement lines imported via bank feeds. Those lines are managed inside
            the {providerDisplayName} reconciliation interface.
          </Typography>

          <Box>
            <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
              What this means
            </Typography>
            <Stack spacing={0.25}>
              {[
                'Bank-originated activity (statement lines) → visible in ' + providerDisplayName + ' Reconcile screen.',
                'Manually-created accounting entries → available under Accounting Transactions.',
                'Reconciliation status → managed in ' + providerDisplayName + ' directly.',
              ].map((item) => (
                <Typography key={item} variant="body2" color="text.secondary">• {item}</Typography>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
              What you can do
            </Typography>
            <Stack spacing={0.25}>
              {[
                'View accounting transactions → Accounting Transactions page.',
                'View reconciled journal history → General Ledger page.',
              ].map((item) => (
                <Typography key={item} variant="body2" color="text.secondary">• {item}</Typography>
              ))}
            </Stack>
          </Box>

          <Alert severity="info" sx={{ mt: 0.5 }}>
            This limitation applies to the current standard {providerDisplayName} Accounting API.
            Other accounting providers may support direct bank feed access.
          </Alert>
        </Stack>
      </Stack>
    </Paper>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function BankFeedPage() {
  const {
    availableProviderOptions, providersLoading, providersError,
    selectedProviderId, setSelectedProviderId, resolvedProviderId, selectedProvider,
    resolvedProviderKey, capabilitiesLoading, getCapabilityStatus,
    availableConnections, connectionsLoading, connectionsError,
    selectedConnectionId, setSelectedConnectionId, resolvedConnectionId,
  } = useAccountingContext();

  const [accountType, setAccountType] = useState<AccountType>('BANK');
  const [selectedAccount, setSelectedAccount] = useState<BankAccountSummary | null>(null);

  const handleProviderChange = useCallback((ccpId: string) => {
    setSelectedProviderId(ccpId);
    setSelectedAccount(null);
  }, [setSelectedProviderId]);

  const handleConnectionChange = useCallback((id: string) => {
    setSelectedConnectionId(id);
    setSelectedAccount(null);
  }, [setSelectedConnectionId]);

  const handleAccountTypeChange = useCallback((type: AccountType) => {
    setAccountType(type);
    setSelectedAccount(null);
  }, []);

  // ── Capability check ──────────────────────────────────────────────────────

  // Use 'banking' capability to determine whether we can list accounts for the selector.
  // Use 'bankFeed' capability to determine whether feed data is available.
  const bankingCapability = getCapabilityStatus('banking');
  const bankFeedCapability = getCapabilityStatus(CAPABILITY_KEY);
  const accountsEnabled = Boolean(resolvedConnectionId) && bankingCapability === 'available';

  // ── Account list (for the selector only) ─────────────────────────────────

  const { data: accountsData, isLoading: accountsLoading } = useBankAccounts(
    resolvedConnectionId || null,
    { limit: 100, accountType },
    { enabled: accountsEnabled },
  );
  const accounts = useMemo<BankAccountSummary[]>(() => accountsData?.data ?? [], [accountsData]);

  useEffect(() => {
    if (accounts.length === 1 && selectedAccount === null) {
      setSelectedAccount(accounts[0]);
    }
  }, [accounts, selectedAccount]);

  // ── Derived ───────────────────────────────────────────────────────────────

  const noProviders   = !providersLoading && !providersError && availableProviderOptions.length === 0;
  const noConnections = !connectionsLoading && !connectionsError &&
    Boolean(resolvedProviderId) && availableConnections.length === 0;
  const providerValue   = resolvedProviderId || selectedProviderId || '';
  const connectionValue = resolvedConnectionId || selectedConnectionId || '';
  const showConnections = Boolean(resolvedProviderId) && availableConnections.length > 0;
  const providerName    = selectedProvider?.displayName ?? resolvedProviderKey ?? 'Provider';
  const AccountIcon     = accountType === 'CREDITCARD' ? CreditCardOutlinedIcon : AccountBalanceOutlinedIcon;
  const accountLabel    = accountType === 'CREDITCARD' ? 'Credit Card' : 'Bank Account';

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Bank Feed"
        subtitle="Bank-originated activity imported from your financial institution."
      />

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 1, mb: 1.5, borderRadius: 2, overflow: 'auto' }}>
        <Box sx={{ display: 'flex', flexWrap: 'nowrap', gap: 1, alignItems: 'center', minWidth: 'max-content' }}>

          <TextField
            select label="Provider" size="small"
            value={providerValue}
            onChange={(e) => handleProviderChange(e.target.value)}
            disabled={providersLoading || availableProviderOptions.length === 0}
            SelectProps={{ displayEmpty: true }}
            sx={{ width: 150 }}
          >
            {availableProviderOptions.length === 0 && (
              <MenuItem value="" disabled>{providersLoading ? 'Loading…' : 'None configured'}</MenuItem>
            )}
            {availableProviderOptions.map((p) => (
              <MenuItem key={p.ccpId} value={p.ccpId}>{p.displayName}</MenuItem>
            ))}
          </TextField>

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

          <TextField
            select label="Account Type" size="small"
            value={accountType}
            onChange={(e) => handleAccountTypeChange(e.target.value as AccountType)}
            disabled={!accountsEnabled}
            sx={{ width: 140 }}
          >
            {ACCOUNT_TYPE_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
            ))}
          </TextField>

          <Autocomplete<BankAccountSummary>
            options={accounts}
            getOptionLabel={accountOptionLabel}
            value={selectedAccount}
            onChange={(_, value) => setSelectedAccount(value)}
            isOptionEqualToValue={(opt, val) => opt.id === val.id}
            disabled={!accountsEnabled || accountsLoading}
            size="small"
            sx={{ width: 240 }}
            renderInput={(params) => (
              <TextField {...params} label={accountLabel} placeholder={`Search ${accountLabel.toLowerCase()}…`} size="small" />
            )}
          />
        </Box>
      </Paper>

      {/* ── Errors ──────────────────────────────────────────────────────── */}
      {providersError && <ErrorState title="Could not load accounting providers" description={extractApiMessage(providersError, 'Check your connection.')} />}
      {noProviders && !providersError && (
        <EmptyState icon={HubOutlinedIcon} title="No accounting providers configured"
          description="Enable Xero (or another accounting provider) for your company."
          action={<Button component={Link} href="/company-channel-providers" variant="contained" startIcon={<HubOutlinedIcon />}>Go to Enabled Providers</Button>}
        />
      )}
      {noConnections && !connectionsError && (
        <EmptyState icon={VpnKeyOutlinedIcon} title="No active connections"
          description={`No active ${providerName} connections found. Add credentials and complete OAuth.`}
          action={<Button component={Link} href="/provider-credentials" variant="contained" startIcon={<VpnKeyOutlinedIcon />}>Go to Provider Credentials</Button>}
        />
      )}
      {connectionsError && (
        <Alert severity="error" sx={{ mb: 2 }}>{extractApiMessage(connectionsError, 'Could not load connections.')}</Alert>
      )}

      {/* ── Capability loading ───────────────────────────────────────────── */}
      {Boolean(resolvedConnectionId) && capabilitiesLoading && (
        <Box display="flex" justifyContent="center" py={4}><CircularProgress /></Box>
      )}

      {/* ── Bank Feed content (capability-driven) ─────────────────────── */}
      {Boolean(resolvedConnectionId) && !capabilitiesLoading && (
        <>
          {/* bankFeed capability is planned or unsupported → show limitation */}
          {(bankFeedCapability === 'planned' || bankFeedCapability === 'unsupported' || bankFeedCapability === null) && (
            <BankFeedLimitationPanel
              providerDisplayName={providerName}
              accountName={selectedAccount?.name}
            />
          )}

          {/* bankFeed capability is available → future: show feed data */}
          {bankFeedCapability === 'available' && (
            <EmptyState
              icon={AccountBalanceWalletOutlinedIcon}
              title="Bank Feed"
              description="Select a financial account above to view bank feed activity."
            />
          )}
        </>
      )}

      {/* No account selected but accounts exist */}
      {accountsEnabled && !accountsLoading && accounts.length > 1 && !selectedAccount && bankFeedCapability !== 'planned' && bankFeedCapability !== 'unsupported' && (
        <EmptyState
          icon={AccountIcon}
          title={`Select a ${accountLabel.toLowerCase()}`}
          description={`Choose a ${accountLabel.toLowerCase()} from the filter above.`}
        />
      )}
    </>
  );
}
