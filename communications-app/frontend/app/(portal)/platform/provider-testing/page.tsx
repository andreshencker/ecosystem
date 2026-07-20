'use client';

import React, { useMemo } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Typography from '@mui/material/Typography';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  DataTable,
  EmptyState,
  ErrorState,
  type MobileCardConfig,
} from '@/components/shared';
import { usePlatformProviders } from '@/hooks/api/usePlatformProviders';
import type { Channel, Provider } from '@/types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  api_key: 'API Key',
  smtp: 'SMTP',
  oauth: 'OAuth 2.0',
  access_keys: 'Access Keys',
};

function getChannelLabel(provider: Provider): string {
  if (typeof provider.channelId === 'object') {
    return (provider.channelId as Channel).displayName;
  }
  return '—';
}

type ProviderStatus = 'configured' | 'inactive';

function computeStatus(provider: Provider): ProviderStatus {
  if (!provider.isActive) return 'inactive';
  return 'configured';
}

const STATUS_CHIP: Record<ProviderStatus, { label: string; color: 'success' | 'default' }> = {
  configured: { label: 'Configured', color: 'success' },
  inactive:   { label: 'Inactive',   color: 'default' },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProviderTestingPage() {
  const { data, isLoading, error } = usePlatformProviders();
  const providers = useMemo(() => data?.items ?? [], [data]);

  const columns = useMemo<GridColDef[]>(
    () => [
      {
        field: 'displayName',
        headerName: 'Provider',
        flex: 1.2,
        minWidth: 140,
        renderCell: (p) => {
          const row = p.row as Provider;
          return (
            <Box>
              <Typography variant="body2" fontWeight={500} noWrap>
                {row.displayName}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontFamily="monospace" display="block" noWrap>
                {row.providerKey}
              </Typography>
            </Box>
          );
        },
      },
      {
        field: 'channelId',
        headerName: 'Channel',
        flex: 1,
        minWidth: 100,
        renderCell: (p) => (
          <Typography variant="body2" color="text.secondary" noWrap>
            {getChannelLabel(p.row as Provider)}
          </Typography>
        ),
      },
      {
        field: 'connectionType',
        headerName: 'Connection Type',
        width: 145,
        renderCell: (p) => {
          const row = p.row as Provider;
          return (
            <Chip
              label={CONNECTION_TYPE_LABELS[row.connectionType] ?? row.connectionType}
              size="small"
              variant="outlined"
            />
          );
        },
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 110,
        renderCell: (p) => {
          const status = computeStatus(p.row as Provider);
          const chip = STATUS_CHIP[status];
          return <Chip label={chip.label} size="small" color={chip.color} variant="outlined" />;
        },
      },
      {
        field: '__note__',
        headerName: 'Note',
        flex: 1,
        minWidth: 180,
        sortable: false,
        renderCell: () => (
          <Typography variant="caption" color="text.secondary">
            Connection test not available yet
          </Typography>
        ),
      },
    ],
    [],
  );

  const mobileCardConfig = useMemo<MobileCardConfig<Provider>>(
    () => ({
      primaryText: 'displayName',
      secondaryText: 'providerKey',
      badge: (row) => {
        const status = computeStatus(row);
        const chip = STATUS_CHIP[status];
        return <Chip label={chip.label} size="small" color={chip.color} variant="outlined" />;
      },
      fields: [
        {
          field: 'channelId',
          label: 'Channel',
          render: (_v, row) => (
            <Typography variant="body2">{getChannelLabel(row)}</Typography>
          ),
        },
        {
          field: 'connectionType',
          label: 'Connection',
          render: (v) => (
            <Chip
              label={CONNECTION_TYPE_LABELS[v as string] ?? String(v)}
              size="small"
              variant="outlined"
            />
          ),
        },
      ],
    }),
    [],
  );

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Provider Testing"
        count={providers.length}
        subtitle="Review provider configuration status."
      />

      <Alert severity="info" sx={{ mb: 2 }}>
        Connection testing requires a backend endpoint. Status shown is based on configuration data
        only.
      </Alert>

      {error ? (
        <ErrorState
          title="Failed to load providers"
          description="Provider status could not be retrieved. Please check your connection and try again."
        />
      ) : (
        <DataTable<Provider>
          rows={providers}
          columns={columns}
          total={providers.length}
          page={0}
          pageSize={100}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          loading={isLoading}
          mobileCardConfig={mobileCardConfig}
          emptyState={
            <EmptyState
              icon={ExtensionOutlinedIcon}
              title="No providers configured"
              description="Create providers on the Providers page to see their status here."
            />
          }
          noRowsLabel="No providers configured."
          getRowId={(row) => row.id}
        />
      )}
    </Box>
  );
}
