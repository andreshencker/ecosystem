'use client';

// Reconciliation — route: /accounting/reconciliation
//
// Represents the relationship between bank-originated transactions (bank feed)
// and accounting transactions in the provider's system.
//
// ARCHITECTURE:
//   Bank Feed (what the bank reports)
//         ↕ reconciliation
//   Accounting Transactions (what the accounting system records)
//
// This page is CAPABILITY-DRIVEN.
// The current standard Xero Accounting API does not expose unreconciled bank
// statement lines required to perform or display reconciliation in Communications.
//
// DO NOT:
//   - Create Match buttons;
//   - Create Reconcile buttons;
//   - Generate fake reconciliation records;
//   - Build local reconciliation logic;
//   - Infer matches from accounting transactions alone.
//
// Communications must NOT become a shadow reconciliation system.

import React, { useCallback } from 'react';
import Link from 'next/link';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import CompareArrowsOutlinedIcon from '@mui/icons-material/CompareArrowsOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import VpnKeyOutlinedIcon from '@mui/icons-material/VpnKeyOutlined';

import { PageHeader } from '@/components/layout';
import { EmptyState, ErrorState } from '@/components/shared';
import {
  useAccountingContext,
  accountingConnectionLabel,
} from '@/providers/AccountingProvider';
import { extractApiMessage } from '@/lib/mapApiError';

// ─── Constants ────────────────────────────────────────────────────────────────

const CAPABILITY_KEY = 'reconciliation';

// ─── Provider limitation panel ────────────────────────────────────────────────

function ReconciliationLimitationPanel({
  providerDisplayName,
}: {
  providerDisplayName: string;
}) {
  return (
    <Paper
      variant="outlined"
      sx={{ p: 3, mt: 1 }}
      data-testid="reconciliation-limitation-panel"
    >
      <Stack direction="row" spacing={2} alignItems="flex-start">
        <InfoOutlinedIcon sx={{ color: 'info.main', mt: 0.25, flexShrink: 0 }} />
        <Stack spacing={1.5}>
          <Typography variant="subtitle2" fontWeight={600}>
            Reconciliation Unavailable via Current API
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Reconciliation is managed in {providerDisplayName}. The current {providerDisplayName} API
            connection does not provide the unreconciled bank statement lines required to
            perform or display reconciliation inside Communications.
          </Typography>

          <Box>
            <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
              What reconciliation requires
            </Typography>
            <Stack spacing={0.25}>
              {[
                'Bank feed statement lines (bank-originated) — not available via standard API.',
                'Accounting transactions to match against.',
                'Provider-side matching and confirmation capability.',
              ].map((item) => (
                <Typography key={item} variant="body2" color="text.secondary">• {item}</Typography>
              ))}
            </Stack>
          </Box>

          <Box>
            <Typography variant="caption" fontWeight={600} display="block" mb={0.5}>
              What you can do from Communications
            </Typography>
            <Stack spacing={0.25}>
              {[
                'View accounting transactions → Accounting Transactions.',
                'View reconciled journal entries → General Ledger.',
                'Create manual journals for external app use → Manual Journals.',
                'Perform reconciliation → open your accounting provider directly.',
              ].map((item) => (
                <Typography key={item} variant="body2" color="text.secondary">• {item}</Typography>
              ))}
            </Stack>
          </Box>

          <Alert severity="warning" data-testid="no-fake-reconciliation-notice">
            Communications does not generate fake match suggestions, locally-inferred
            reconciliation records, or shadow accounting data.
            Only genuinely available provider data is displayed.
          </Alert>

          <Box
            sx={{
              borderTop: 1,
              borderColor: 'divider',
              pt: 1.5,
              mt: 0.5,
            }}
          >
            <Typography variant="caption" fontWeight={600} display="block" mb={0.75} color="text.secondary">
              Future architecture (when provider exposes the required API)
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 1.5,
                bgcolor: 'action.hover',
                fontFamily: 'monospace',
                fontSize: '0.75rem',
                lineHeight: 1.8,
              }}
            >
              <Typography variant="caption" fontFamily="monospace" display="block">
                {'Bank Feed (left)          |  Accounting Transactions (right)'}
              </Typography>
              <Typography variant="caption" fontFamily="monospace" display="block" color="text.disabled">
                {'─────────────────────────┼─────────────────────────────────'}
              </Typography>
              <Typography variant="caption" fontFamily="monospace" display="block">
                {'Statement Line           |  Suggested / Matched Transaction'}
              </Typography>
              <Typography variant="caption" fontFamily="monospace" display="block">
                {'Status: Unmatched        |  Status: —'}
              </Typography>
              <Typography variant="caption" fontFamily="monospace" display="block" color="success.main">
                {'Status: Matched          |  Status: Authorised'}
              </Typography>
              <Typography variant="caption" fontFamily="monospace" display="block" color="success.main">
                {'Status: Reconciled       |  Status: Reconciled'}
              </Typography>
            </Paper>
            <Typography variant="caption" color="text.disabled" display="block" mt={0.5}>
              This layout is shown when a provider supports the reconciliation capability.
              No match or reconcile actions are available for {providerDisplayName} through the current API.
            </Typography>
          </Box>
        </Stack>
      </Stack>
    </Paper>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const {
    availableProviderOptions, providersLoading, providersError,
    selectedProviderId, setSelectedProviderId, resolvedProviderId, selectedProvider,
    resolvedProviderKey, capabilitiesLoading, getCapabilityStatus,
    availableConnections, connectionsLoading, connectionsError,
    selectedConnectionId, setSelectedConnectionId, resolvedConnectionId,
  } = useAccountingContext();

  const handleProviderChange = useCallback((ccpId: string) => {
    setSelectedProviderId(ccpId);
  }, [setSelectedProviderId]);

  const handleConnectionChange = useCallback((id: string) => {
    setSelectedConnectionId(id);
  }, [setSelectedConnectionId]);

  // ── Capability check ──────────────────────────────────────────────────────

  const reconciliationCapability = getCapabilityStatus(CAPABILITY_KEY);

  // ── Derived ───────────────────────────────────────────────────────────────

  const noProviders   = !providersLoading && !providersError && availableProviderOptions.length === 0;
  const noConnections = !connectionsLoading && !connectionsError &&
    Boolean(resolvedProviderId) && availableConnections.length === 0;
  const providerValue   = resolvedProviderId || selectedProviderId || '';
  const connectionValue = resolvedConnectionId || selectedConnectionId || '';
  const showConnections = Boolean(resolvedProviderId) && availableConnections.length > 0;
  const providerName    = selectedProvider?.displayName ?? resolvedProviderKey ?? 'Provider';

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      <PageHeader
        title="Reconciliation"
        subtitle="Match bank feed activity to accounting transactions."
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

      {/* ── No connection selected yet ───────────────────────────────────── */}
      {!resolvedConnectionId && !noProviders && !noConnections && !providersError && !connectionsError && (
        <EmptyState
          icon={CompareArrowsOutlinedIcon}
          title="Select a provider and connection"
          description="Choose an accounting provider and connection above to view reconciliation status."
        />
      )}

      {/* ── Reconciliation content (capability-driven) ────────────────── */}
      {Boolean(resolvedConnectionId) && !capabilitiesLoading && (
        <>
          {/* reconciliation capability is planned or unsupported → limitation panel */}
          {(reconciliationCapability === 'planned' ||
            reconciliationCapability === 'unsupported' ||
            reconciliationCapability === null) && (
            <ReconciliationLimitationPanel providerDisplayName={providerName} />
          )}

          {/* reconciliation capability is available → future: show two-panel UI */}
          {reconciliationCapability === 'available' && (
            <EmptyState
              icon={CompareArrowsOutlinedIcon}
              title="Reconciliation"
              description="Select a financial account and date range to begin reconciliation."
            />
          )}
        </>
      )}
    </>
  );
}
