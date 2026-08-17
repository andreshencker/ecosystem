'use client';

// Generic OAuth connection panel.
//
// Renders Connect / Reconnect / Test Connection / Disconnect actions for any
// provider whose ProviderCredentialConfig has `oauthConfig` set.
//
// No provider-name branching. The `oauthBasePath` determines which API routes
// are called. Future providers (QuickBooks, MYOB, Sage, etc.) reuse this
// component without modification.
//
// Security:
//   - No tokens, client secrets, or raw provider data reach this component.
//   - Only safe display metadata (tenantName, organisationName, scopes, expiry)
//     is rendered.
//   - The authorizationUrl returned by the start endpoint is used only for
//     window.location.href — never stored in state or localStorage.

import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import NetworkCheckOutlinedIcon from '@mui/icons-material/NetworkCheckOutlined';
import LinkOffOutlinedIcon from '@mui/icons-material/LinkOffOutlined';
import { LoadingButton, ConfirmDialog } from '@/components/shared';
import { useUIStore } from '@/stores/ui.store';
import { extractApiMessage } from '@/lib/mapApiError';
import {
  useStartOAuthMutation,
  useTestOAuthConnectionMutation,
  useDisconnectOAuthMutation,
  useConnectionOrganisations,
  useRefreshOrganisationsMutation,
  type OAuthConnectionStatus,
} from '@/hooks/api/useOAuthConnections';

// ─── Props ────────────────────────────────────────────────────────────────────

interface OAuthConnectPanelProps {
  /**
   * API route prefix. e.g. '/accounting/oauth/xero'
   * All OAuth API paths are derived from this.
   */
  oauthBasePath: string;
  /**
   * ProviderCredentials._id — required to call start/test/disconnect.
   * When undefined/null the Connect button is disabled (credential not yet saved).
   */
  credentialId: string | null | undefined;
  /** Provider display name shown in labels (e.g. 'Xero'). */
  providerName: string;
  /**
   * Safe non-secret identifier set by the backend after successful OAuth.
   * Typically the Xero organisation/tenant name.
   * When null/undefined the panel shows "Not connected".
   */
  displayIdentifier?: string | null;
  /**
   * When true, the panel fetches authorised organisations and shows the count
   * along with a Refresh Organisations button.
   * Driven by OAuthProviderConfig.supportsOrganisations — no provider branching here.
   */
  supportsOrganisations?: boolean;
  /** Called after a successful disconnect so the parent can refresh data. */
  onDisconnected?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OAuthConnectPanel({
  oauthBasePath,
  credentialId,
  providerName,
  displayIdentifier,
  supportsOrganisations,
  onDisconnected,
}: OAuthConnectPanelProps) {
  const pushSnack = useUIStore((s) => s.pushSnack);

  const isConnected = Boolean(displayIdentifier);

  const startMutation      = useStartOAuthMutation(oauthBasePath);
  const testMutation       = useTestOAuthConnectionMutation(oauthBasePath);
  const disconnectMutation = useDisconnectOAuthMutation(oauthBasePath);
  const refreshOrgsMutation = useRefreshOrganisationsMutation(oauthBasePath);

  // Organisation list — only fetched when isConnected and provider supports it.
  const { data: orgsData, isLoading: orgsLoading } = useConnectionOrganisations(
    supportsOrganisations && isConnected ? oauthBasePath : null,
    supportsOrganisations && isConnected ? credentialId  : null,
  );

  const [testResult,        setTestResult]        = useState<OAuthConnectionStatus | null>(null);
  const [disconnectOpen,    setDisconnectOpen]     = useState(false);

  // ── Connect / Reconnect ───────────────────────────────────────────────────

  const handleConnect = async () => {
    if (!credentialId) return;
    try {
      const { authorizationUrl } = await startMutation.mutateAsync({
        providerCredentialsId: credentialId,
      });
      // Full-page redirect to the provider's authorization page.
      window.location.href = authorizationUrl;
    } catch (e) {
      pushSnack({ type: 'error', message: extractApiMessage(e, `Could not start the ${providerName} connection.`) });
    }
  };

  // ── Test connection ───────────────────────────────────────────────────────

  const handleTest = async () => {
    if (!credentialId) return;
    setTestResult(null);
    try {
      const result = await testMutation.mutateAsync(credentialId);
      setTestResult(result);
    } catch (e) {
      pushSnack({ type: 'error', message: extractApiMessage(e, `Could not verify the ${providerName} connection.`) });
    }
  };

  // ── Refresh organisations ─────────────────────────────────────────────────

  const handleRefreshOrganisations = async () => {
    if (!credentialId) return;
    try {
      const result = await refreshOrgsMutation.mutateAsync(credentialId);
      pushSnack({
        type:    'success',
        message: result.message ?? `${result.nowAvailable} organisation(s) available`,
      });
    } catch (e) {
      pushSnack({ type: 'error', message: extractApiMessage(e, 'Could not refresh organisations.') });
    }
  };

  // ── Disconnect ────────────────────────────────────────────────────────────

  const handleDisconnect = async () => {
    if (!credentialId) return;
    setDisconnectOpen(false);
    try {
      const result = await disconnectMutation.mutateAsync(credentialId);
      const name = result.tenantName ?? providerName;
      pushSnack({ type: 'success', message: `${name} disconnected` });
      setTestResult(null);
      onDisconnected?.();
    } catch (e) {
      pushSnack({ type: 'error', message: extractApiMessage(e, `Could not disconnect ${providerName}.`) });
    }
  };

  const isAnyLoading =
    startMutation.isPending ||
    testMutation.isPending ||
    disconnectMutation.isPending ||
    refreshOrgsMutation.isPending;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <Box
      sx={{
        border: '1px solid',
        borderColor: isConnected ? 'success.light' : 'divider',
        borderRadius: 1.5,
        p: 2,
        bgcolor: isConnected ? 'success.50' : 'background.paper',
      }}
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" spacing={1.5} mb={isConnected ? 1 : 0}>
        {isConnected ? (
          <CheckCircleOutlinedIcon color="success" />
        ) : (
          <LinkOutlinedIcon color="disabled" />
        )}
        <Box flex={1}>
          <Typography variant="body2" fontWeight={600}>
            {providerName} Connection
          </Typography>
          {isConnected ? (
            <Typography variant="caption" color="success.dark">
              Connected · {displayIdentifier}
            </Typography>
          ) : (
            <Typography variant="caption" color="text.secondary">
              Not connected
            </Typography>
          )}
        </Box>
      </Stack>

      {/* ── Not connected message ───────────────────────────────────────── */}
      {!isConnected && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1.5} mt={0.5}>
          Save your Client ID and Client Secret below, then click Connect to
          authorise your {providerName} organisation.
        </Typography>
      )}

      {/* ── Organisation count (when supported and connected) ──────────── */}
      {supportsOrganisations && isConnected && (
        <Typography variant="caption" color="text.secondary" display="block" mb={1}>
          {orgsLoading
            ? 'Loading organisations…'
            : orgsData
              ? `${orgsData.available} authorised organisation${orgsData.available !== 1 ? 's' : ''}`
              : null}
        </Typography>
      )}

      {/* ── Action buttons ──────────────────────────────────────────────── */}
      <Stack direction="row" spacing={1} flexWrap="wrap" mt={isConnected ? 0 : 0}>
        {!isConnected ? (
          <LoadingButton
            variant="contained"
            size="small"
            loading={startMutation.isPending}
            disabled={!credentialId || isAnyLoading}
            onClick={handleConnect}
            startIcon={<LinkOutlinedIcon />}
          >
            Connect with {providerName}
          </LoadingButton>
        ) : (
          <>
            <LoadingButton
              variant="outlined"
              size="small"
              loading={testMutation.isPending}
              disabled={isAnyLoading}
              onClick={handleTest}
              startIcon={<NetworkCheckOutlinedIcon />}
            >
              Test Connection
            </LoadingButton>
            {supportsOrganisations && (
              <LoadingButton
                variant="outlined"
                size="small"
                loading={refreshOrgsMutation.isPending}
                disabled={isAnyLoading}
                onClick={handleRefreshOrganisations}
              >
                Refresh Organisations
              </LoadingButton>
            )}
            <Button
              variant="outlined"
              size="small"
              color="warning"
              disabled={isAnyLoading}
              onClick={handleConnect}
              startIcon={<LinkOutlinedIcon />}
            >
              Reconnect
            </Button>
            <LoadingButton
              variant="outlined"
              size="small"
              color="error"
              loading={disconnectMutation.isPending}
              disabled={isAnyLoading}
              onClick={() => setDisconnectOpen(true)}
              startIcon={<LinkOffOutlinedIcon />}
            >
              Disconnect
            </LoadingButton>
          </>
        )}
      </Stack>

      {/* ── Test result ─────────────────────────────────────────────────── */}
      {testResult && (
        <Box mt={1.5}>
          <Divider sx={{ mb: 1.5 }} />
          <Alert
            severity={testResult.connected ? 'success' : 'error'}
            icon={
              testResult.connected ? (
                <CheckCircleOutlinedIcon fontSize="inherit" />
              ) : (
                <ErrorOutlineIcon fontSize="inherit" />
              )
            }
            sx={{ py: 0.75 }}
          >
            <Typography variant="body2" fontWeight={500}>
              {testResult.connected ? 'Connection verified' : 'Connection failed'}
            </Typography>

            {testResult.reason && (
              <Typography variant="caption" display="block" mt={0.25}>
                {testResult.reason}
              </Typography>
            )}

            {testResult.connected && (
              <Stack spacing={0.5} mt={0.75}>
                {testResult.organisationName && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88 }}>
                      Organisation
                    </Typography>
                    <Typography variant="caption">{testResult.organisationName}</Typography>
                  </Stack>
                )}
                {testResult.grantedScopes && (
                  <Stack direction="row" spacing={1} alignItems="flex-start">
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88 }}>
                      Scopes
                    </Typography>
                    <Box>
                      {testResult.grantedScopes
                        .split(' ')
                        .filter(Boolean)
                        .map((s) => (
                          <Chip
                            key={s}
                            label={s}
                            size="small"
                            variant="outlined"
                            sx={{ mr: 0.5, mb: 0.5, fontSize: '0.65rem' }}
                          />
                        ))}
                    </Box>
                  </Stack>
                )}
                {testResult.tokenExpiresAt && (
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88 }}>
                      Token expires
                    </Typography>
                    <Typography variant="caption">
                      {new Date(testResult.tokenExpiresAt).toLocaleString()}
                    </Typography>
                  </Stack>
                )}
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="caption" color="text.secondary" sx={{ minWidth: 88 }}>
                    Verified at
                  </Typography>
                  <Typography variant="caption">
                    {new Date(testResult.checkedAt).toLocaleString()}
                  </Typography>
                </Stack>
              </Stack>
            )}
          </Alert>
        </Box>
      )}

      {/* ── Disconnect confirmation ──────────────────────────────────────── */}
      <ConfirmDialog
        open={disconnectOpen}
        title={`Disconnect ${providerName}?`}
        description={
          `This will revoke the ${providerName} connection and deactivate this credential. ` +
          `Accounting integrations using this connection will stop working. ` +
          `You can reconnect at any time.`
        }
        confirmLabel="Disconnect"
        danger
        loading={disconnectMutation.isPending}
        onConfirm={handleDisconnect}
        onCancel={() => setDisconnectOpen(false)}
      />
    </Box>
  );
}
