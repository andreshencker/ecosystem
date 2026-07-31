'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import ConstructionOutlinedIcon from '@mui/icons-material/ConstructionOutlined';
import { PageHeader } from '@/components/layout';
import { EmptyState } from '@/components/shared';
import { PaymentsFilter } from '@/components/domain/payment/PaymentsFilter';
import { connectionLabel, usePaymentsContext } from '@/providers/PaymentsProvider';

export default function PaymentsSettingsPage() {
  const {
    selectedConnection,
    resolvedConnectionId,
    connectionsLoading,
    connections,
  } = usePaymentsContext();

  const pageSubtitle = selectedConnection
    ? `Connection: ${connectionLabel(selectedConnection)}`
    : undefined;

  if (connectionsLoading) return null;

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Provider Settings"
        subtitle={pageSubtitle}
        breadcrumbs={[
          { label: 'Payments', href: '/payments' },
          { label: 'Settings' },
        ]}
      />

      <PaymentsFilter />

      {connections.length === 0 ? (
        <EmptyState
          icon={ConstructionOutlinedIcon}
          title="No payment providers configured"
          description="Configure a payment provider credential to get started."
        />
      ) : resolvedConnectionId ? (
        <EmptyState
          icon={ConstructionOutlinedIcon}
          title="Provider Settings — not yet implemented"
          description="Webhook endpoints, API key rotation, and provider-level settings will appear here."
        />
      ) : (
        <Typography variant="body2" color="text.secondary">
          Select a provider and connection above to continue.
        </Typography>
      )}
    </Box>
  );
}
