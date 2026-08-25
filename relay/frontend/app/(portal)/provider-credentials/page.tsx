'use client';

import React, { Suspense, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import { PageHeader } from '@/components/layout';
import { CredentialList, TenantSelectionDialog } from '@/components/domain/credential';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { useQueryClient } from '@tanstack/react-query';

// ─── OAuth callback handler ───────────────────────────────────────────────────
// This component reads the ?status=... params injected by the backend OAuth
// callback redirect. It handles all terminal states without exposing tokens.

function OAuthCallbackHandler({ companyId }: { companyId: string | null }) {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const pushSnack    = useUIStore((s) => s.pushSnack);
  const qc           = useQueryClient();

  const status       = searchParams.get('status');
  const credentialId = searchParams.get('credentialId');
  const sessionId    = searchParams.get('sessionId');
  const oauthBasePath = searchParams.get('oauthBasePath');
  const reason       = searchParams.get('reason');

  // Track whether we've opened the dialog so it survives the URL clear.
  const tenantDialogOpen = status === 'select_tenant' && Boolean(sessionId && oauthBasePath);
  const [dialogOpen, setDialogOpen] = React.useState(tenantDialogOpen);

  // Clear OAuth query params from the URL after first read.
  // This prevents showing the snack/dialog again on refresh.
  const handledRef = useRef(false);
  useEffect(() => {
    if (!status || handledRef.current) return;
    handledRef.current = true;

    if (status === 'connected') {
      qc.invalidateQueries({ queryKey: ['provider-credentials'] });
      pushSnack({ type: 'success', message: 'Connection authorised successfully.' });
      // Replace URL without OAuth params (keep page but remove callback state).
      router.replace('/provider-credentials');
    }

    if (status === 'error' && reason) {
      pushSnack({ type: 'error', message: `Connection failed: ${reason}` });
      router.replace('/provider-credentials');
    }

    // For select_tenant we keep the params until the dialog is used.
    // The dialog closing removes the params.
  }, [status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!dialogOpen || !sessionId || !oauthBasePath) return null;

  return (
    <TenantSelectionDialog
      open={dialogOpen}
      oauthBasePath={oauthBasePath}
      sessionId={sessionId}
      providerName="Provider"
      onConnected={(_credId, tenantName) => {
        setDialogOpen(false);
        qc.invalidateQueries({ queryKey: ['provider-credentials'] });
        pushSnack({
          type: 'success',
          message: tenantName
            ? `Connected to ${tenantName}`
            : 'Connection authorised successfully.',
        });
        router.replace('/provider-credentials');
      }}
      onClose={() => {
        setDialogOpen(false);
        router.replace('/provider-credentials');
      }}
    />
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderCredentialsPage() {
  const companyId = useAuthStore((s) => s.companyId);

  return (
    <Box>
      <PageHeader
        title="Credentials"
        subtitle="Encrypted credentials for each channel provider."
      />

      {/* Handle OAuth callback redirects */}
      <Suspense fallback={<CircularProgress size={20} sx={{ ml: 1 }} />}>
        <OAuthCallbackHandler companyId={companyId} />
      </Suspense>

      {companyId ? (
        <CredentialList companyId={companyId} />
      ) : (
        <Box py={4} textAlign="center" color="text.secondary">
          No company assigned to your account.
        </Box>
      )}
    </Box>
  );
}
