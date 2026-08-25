'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CircularProgress from '@mui/material/CircularProgress';
import Grid from '@mui/material/Grid';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import LinkOutlinedIcon from '@mui/icons-material/LinkOutlined';
import SettingsInputComponentOutlinedIcon from '@mui/icons-material/SettingsInputComponentOutlined';
import { PageHeader } from '@/components/layout';
import { EmptyState } from '@/components/shared';
import { PaymentsFilter } from '@/components/domain/payment/PaymentsFilter';
import { ProviderFeatureUnavailable } from '@/components/domain/payment/ProviderFeatureUnavailable';
import { connectionLabel, usePaymentsContext } from '@/providers/PaymentsProvider';
import { PAGE_CAPABILITY, PAGE_FEATURE_DISPLAY_NAME } from '@/lib/config/payments-capability-map';

function StatCard({
  icon: Icon,
  label,
  value,
  loading,
  secondary,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  loading?: boolean;
  secondary?: string;
}) {
  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent>
        <Box display="flex" alignItems="center" gap={1.5} mb={1.5}>
          <Icon sx={{ fontSize: 24, color: 'primary.main' }} />
          <Typography variant="body2" color="text.secondary">
            {label}
          </Typography>
        </Box>
        {loading ? (
          <CircularProgress size={20} />
        ) : (
          <Stack spacing={0.25}>
            <Typography variant="h5" fontWeight={600}>
              {value}
            </Typography>
            {secondary && (
              <Typography variant="caption" color="text.secondary">
                {secondary}
              </Typography>
            )}
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

export default function PaymentsDashboardPage() {
  const {
    availableProviderOptions,
    providersLoading,
    providersError,
    resolvedProviderKey,
    selectedProvider,
    resolvedConnectionId,
    selectedConnection,
    availableConnections,
    connectionsLoading,
    getCapabilityStatus,
  } = usePaymentsContext();

  const capabilityStatus = getCapabilityStatus(PAGE_CAPABILITY.dashboard);
  const capabilityBlocks =
    Boolean(resolvedProviderKey) &&
    Boolean(capabilityStatus) &&
    capabilityStatus !== 'available';

  const activeConnections = availableConnections.filter((c) => c.isActive);

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Payments"
        subtitle="Provider-centric payments management. Select a provider to get started."
      />

      {/* Provider + Connection filter — sourced from CompanyChannelProvider */}
      <PaymentsFilter />

      {/* No providers configured */}
      {!providersLoading && !providersError && availableProviderOptions.length === 0 && (
        <EmptyState
          icon={ExtensionOutlinedIcon}
          title="No payment providers configured"
          description="Configure a payment provider credential in the Credentials page to get started."
        />
      )}

      {/* Capability guard: provider dashboard not yet available */}
      {capabilityBlocks && capabilityStatus && (
        <ProviderFeatureUnavailable
          featureDisplayName={PAGE_FEATURE_DISPLAY_NAME.dashboard}
          providerDisplayName={selectedProvider?.displayName ?? resolvedProviderKey}
          status={capabilityStatus as 'planned' | 'unsupported'}
        />
      )}

      {/* Selected provider context cards — only when capability is available */}
      {resolvedProviderKey && !capabilityBlocks && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={ExtensionOutlinedIcon}
              label="Provider"
              value={selectedProvider?.displayName ?? resolvedProviderKey}
              loading={providersLoading}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              icon={LinkOutlinedIcon}
              label="Active Connections"
              value={activeConnections.length}
              secondary={`of ${availableConnections.length} total`}
              loading={connectionsLoading}
            />
          </Grid>
          {selectedConnection && (
            <>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={CheckCircleOutlinedIcon}
                  label="Selected Connection"
                  value={connectionLabel(selectedConnection)}
                  secondary={selectedConnection.isActive ? 'Active' : 'Inactive'}
                  loading={connectionsLoading}
                />
              </Grid>
              <Grid item xs={12} sm={6} md={3}>
                <StatCard
                  icon={SettingsInputComponentOutlinedIcon}
                  label="Connection Type"
                  value={selectedConnection.connectionType}
                  secondary={
                    selectedConnection.connectedAt
                      ? `Connected ${new Date(selectedConnection.connectedAt).toLocaleDateString()}`
                      : undefined
                  }
                  loading={connectionsLoading}
                />
              </Grid>
            </>
          )}
        </Grid>
      )}

      {/* No connection available for the selected provider */}
      {!connectionsLoading &&
        resolvedProviderKey &&
        !resolvedConnectionId &&
        !capabilityBlocks && (
          <EmptyState
            icon={LinkOutlinedIcon}
            title="No active connection"
            description={`No active connections found for ${selectedProvider?.displayName ?? resolvedProviderKey}. Configure credentials in the Credentials page.`}
          />
        )}

      {/* Multiple providers, none selected yet */}
      {!providersLoading &&
        availableProviderOptions.length > 1 &&
        !resolvedProviderKey && (
          <Typography variant="body2" color="text.secondary">
            Select a provider above to see its connection status and capabilities.
          </Typography>
        )}
    </Box>
  );
}
