'use client';

// Generic OAuth tenant selection dialog.
//
// Shown when the OAuth callback returns status=select_tenant.
// The user authorised multiple Xero organisations — they must pick one.
//
// Generic: works for any OAuth provider with a multi-tenant selection step.
// The oauthBasePath determines which API endpoints are called — no provider
// branching in this component.
//
// Security: only safe tenant metadata (tenantId, tenantName, tenantType) is
// displayed. No tokens reach this component.

import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import { LoadingButton } from '@/components/shared';
import { useUIStore } from '@/stores/ui.store';
import { mapApiError } from '@/lib/mapApiError';
import {
  useOAuthTenants,
  useSelectOAuthTenantMutation,
  type OAuthTenantOption,
} from '@/hooks/api/useOAuthConnections';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TenantSelectionDialogProps {
  open: boolean;
  /**
   * API route prefix for this provider's OAuth endpoints.
   * e.g. '/accounting/oauth/xero'
   */
  oauthBasePath: string;
  /**
   * Pending session ID from the OAuth callback redirect.
   * The session is server-side (Redis) — the browser only holds the opaque ID.
   */
  sessionId: string;
  /** e.g. 'Xero' — shown in dialog title and labels. */
  providerName?: string;
  /** Called after a tenant is successfully selected. */
  onConnected: (credentialId: string, tenantName: string | null) => void;
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TenantSelectionDialog({
  open,
  oauthBasePath,
  sessionId,
  providerName = 'Provider',
  onConnected,
  onClose,
}: TenantSelectionDialogProps) {
  const pushSnack = useUIStore((s) => s.pushSnack);

  const { data: tenants, isLoading, isError, error } = useOAuthTenants(
    open ? oauthBasePath : null,
    open ? sessionId : null,
  );

  const selectMutation = useSelectOAuthTenantMutation(oauthBasePath);
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);

  const handleSelect = async () => {
    if (!selectedTenantId) return;
    try {
      const result = await selectMutation.mutateAsync({
        sessionId,
        tenantId: selectedTenantId,
      });
      pushSnack({
        type: 'success',
        message: `Connected to ${result.tenantName ?? providerName}`,
      });
      onConnected(result.credentialId, result.tenantName);
    } catch (e) {
      pushSnack({ type: 'error', message: mapApiError(e) });
    }
  };

  const isSelecting = selectMutation.isPending;

  return (
    <Dialog open={open} onClose={isSelecting ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Select {providerName} Organisation
      </DialogTitle>

      <DialogContent dividers sx={{ pt: 1.5 }}>
        <Typography variant="body2" color="text.secondary" mb={2}>
          Your account is connected to multiple {providerName} organisations.
          Select the one you want to use for this connection.
        </Typography>

        {isLoading && (
          <Box display="flex" justifyContent="center" py={3}>
            <CircularProgress size={28} />
          </Box>
        )}

        {isError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            {mapApiError(error) || 'Failed to load organisation list. The selection window may have expired — please reconnect.'}
          </Alert>
        )}

        {tenants && tenants.length === 0 && (
          <Alert severity="warning">
            No organisations were returned. Please reconnect and authorise at least one organisation.
          </Alert>
        )}

        {tenants && tenants.length > 0 && (
          <List disablePadding>
            {tenants.map((tenant: OAuthTenantOption) => (
              <ListItemButton
                key={tenant.tenantId}
                selected={selectedTenantId === tenant.tenantId}
                onClick={() => setSelectedTenantId(tenant.tenantId)}
                disabled={isSelecting}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  border: '1px solid',
                  borderColor:
                    selectedTenantId === tenant.tenantId
                      ? 'primary.main'
                      : 'divider',
                }}
              >
                <BusinessOutlinedIcon
                  sx={{ mr: 1.5, color: 'text.secondary', fontSize: 20 }}
                />
                <ListItemText
                  primary={
                    tenant.tenantName ?? `Unnamed Organisation (${tenant.tenantType})`
                  }
                  secondary={tenant.tenantType}
                  primaryTypographyProps={{ variant: 'body2', fontWeight: 500 }}
                  secondaryTypographyProps={{ variant: 'caption' }}
                />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 1.5 }}>
        <Button
          variant="outlined"
          onClick={onClose}
          disabled={isSelecting}
        >
          Cancel
        </Button>
        <LoadingButton
          variant="contained"
          loading={isSelecting}
          disabled={!selectedTenantId || isLoading || isError}
          onClick={handleSelect}
        >
          Connect Organisation
        </LoadingButton>
      </DialogActions>
    </Dialog>
  );
}
