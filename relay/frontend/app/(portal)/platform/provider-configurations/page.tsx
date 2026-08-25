'use client';

import React, { useState } from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import { DataTable, ErrorState, StatusBadge, type MobileCardConfig } from '@/components/shared';
import {
  CREDENTIAL_SCHEMAS,
  type CredentialFieldDef,
} from '@/components/shared/DynamicCredentialForm';
import { usePlatformProviders } from '@/hooks/api/usePlatformProviders';
import type { Provider } from '@/types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONNECTION_TYPES = [
  { value: 'api_key', label: 'API Key' },
  { value: 'smtp', label: 'SMTP' },
  { value: 'oauth', label: 'OAuth 2.0' },
  { value: 'access_keys', label: 'Access Keys' },
];


// ─── Schema Table ─────────────────────────────────────────────────────────────

function SchemaTable({ fields }: { fields: CredentialFieldDef[] }) {
  return (
    <TableContainer sx={{ overflowX: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Field Key</TableCell>
            <TableCell>Label</TableCell>
            <TableCell>Type</TableCell>
            <TableCell>Required</TableCell>
            <TableCell>Placeholder</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {fields.map((f) => (
            <TableRow key={f.key}>
              <TableCell>
                <Typography variant="body2" fontFamily="monospace" fontWeight={500}>
                  {f.key}
                </Typography>
              </TableCell>
              <TableCell>
                <Typography variant="body2">{f.label}</Typography>
              </TableCell>
              <TableCell>
                <Chip label={f.type} size="small" variant="outlined" />
              </TableCell>
              <TableCell>
                <Chip
                  label={f.required ? 'Yes' : 'No'}
                  size="small"
                  color={f.required ? 'primary' : 'default'}
                  variant="outlined"
                />
              </TableCell>
              <TableCell>
                <Typography variant="body2" color="text.secondary">
                  {f.placeholder ?? '—'}
                </Typography>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const matchingColumns: GridColDef[] = [
  {
    field: 'providerKey',
    headerName: 'Provider Key',
    flex: 1,
    minWidth: 120,
    renderCell: (p) => (
      <Typography variant="body2" fontFamily="monospace" fontWeight={500} noWrap>
        {(p.row as Provider).providerKey}
      </Typography>
    ),
  },
  {
    field: 'displayName',
    headerName: 'Display Name',
    flex: 1.2,
    minWidth: 140,
    renderCell: (p) => (
      <Typography variant="body2" noWrap>{(p.row as Provider).displayName}</Typography>
    ),
  },
  {
    field: 'isActive',
    headerName: 'Status',
    width: 100,
    renderCell: (p) => <StatusBadge active={(p.row as Provider).isActive} />,
  },
];

const matchingMobileConfig: MobileCardConfig<Provider> = {
  primaryText: 'displayName',
  secondaryText: 'providerKey',
  badge: (row) => <StatusBadge active={row.isActive} />,
  fields: [],
};

export default function ProviderConfigurationsPage() {
  const [selectedType, setSelectedType] = useState('');

  const { data, isLoading, error } = usePlatformProviders();
  const providers = data?.items ?? [];

  const fields = selectedType ? (CREDENTIAL_SCHEMAS[selectedType] ?? null) : null;

  const matchingProviders = selectedType
    ? providers.filter((p) => p.connectionType === selectedType)
    : [];

  return (
    <Box sx={{ minWidth: 0 }}>
      <PageHeader
        title="Provider Schemas"
        subtitle="View credential field schemas for each provider connection type."
      />

      <Box>
        <Stack spacing={3}>
          <Alert severity="info">
            Schema definitions are based on connection type. Custom schema configuration is planned
            for Phase 4.
          </Alert>

          {/* Connection type selector */}
          <TextField
            select
            size="small"
            label="Connection Type"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            sx={{ maxWidth: 280 }}
          >
            <MenuItem value="">
              <em>Select a connection type…</em>
            </MenuItem>
            {CONNECTION_TYPES.map((ct) => (
              <MenuItem key={ct.value} value={ct.value}>
                {ct.label}
              </MenuItem>
            ))}
          </TextField>

          {/* Schema fields */}
          {selectedType && fields && (
            <Card variant="outlined">
              <Box px={2} py={1.5} borderBottom="1px solid" borderColor="divider">
                <Typography variant="subtitle2" fontWeight={600}>
                  Credential Fields —{' '}
                  {CONNECTION_TYPES.find((ct) => ct.value === selectedType)?.label}
                </Typography>
              </Box>
              <SchemaTable fields={fields} />
            </Card>
          )}

          {/* Providers using this connection type */}
          {selectedType && (
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                Providers using this connection type
              </Typography>

              {isLoading ? (
                <Box display="flex" justifyContent="center" py={4}>
                  <CircularProgress size={28} />
                </Box>
              ) : error ? (
                <ErrorState
                  title="Failed to load providers"
                  description="Provider list could not be retrieved."
                />
              ) : matchingProviders.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  No providers currently use this connection type.
                </Typography>
              ) : (
                <DataTable<Provider>
                  rows={matchingProviders}
                  columns={matchingColumns}
                  total={matchingProviders.length}
                  page={0}
                  pageSize={50}
                  onPageChange={() => {}}
                  onPageSizeChange={() => {}}
                  mobileCardConfig={matchingMobileConfig}
                  noRowsLabel="No matching providers."
                  getRowId={(row) => row.id}
                />
              )}
            </Box>
          )}
        </Stack>
      </Box>
    </Box>
  );
}
