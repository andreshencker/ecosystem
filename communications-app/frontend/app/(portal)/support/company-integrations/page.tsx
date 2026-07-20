'use client';

import React, { useState, useMemo, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import ExtensionOutlinedIcon from '@mui/icons-material/ExtensionOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  FormDrawer,
  PermissionGuard,
  RowActions,
  StatusBadge,
  type MobileCardConfig,
} from '@/components/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { useCompanies } from '@/hooks/api/useCompanies';
import {
  useCompanyIntegrationsPlatform,
  useDeactivateCompanyIntegrationMutation,
  useActivateCompanyIntegrationMutation,
} from '@/hooks/api/useCompanyIntegrations';
import type { CompanyIntegrationPlatformView, IntegrationEnvironment } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const ENV_LABELS: Record<IntegrationEnvironment, string> = {
  development: 'Development',
  staging:     'Staging',
  production:  'Production',
};

const ENV_COLORS: Record<IntegrationEnvironment, 'default' | 'warning' | 'success'> = {
  development: 'default',
  staging:     'warning',
  production:  'success',
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatRelativeDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  const diff = Date.now() - d.getTime();
  if (diff < 60_000) return 'just now';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 7 * 86_400_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-AU', { day: '2-digit', month: 'short', year: 'numeric' });
}

function isExpired(iso: string | null | undefined): boolean {
  if (!iso) return false;
  return new Date(iso) < new Date();
}

// ─── Detail Drawer ────────────────────────────────────────────────────────────

interface DetailDrawerProps {
  open: boolean;
  integration: CompanyIntegrationPlatformView | null;
  onClose: () => void;
}

function DetailDrawer({ open, integration, onClose }: DetailDrawerProps) {
  if (!integration) return null;

  function Row({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
    return (
      <Box>
        <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} display="block" mb={0.25}>
          {label}
        </Typography>
        {typeof value === 'string' ? (
          <Typography variant="body2" fontFamily={mono ? 'monospace' : undefined} fontSize={mono ? '0.8rem' : undefined}>
            {value || '—'}
          </Typography>
        ) : value}
      </Box>
    );
  }

  const expired = isExpired(integration.expiresAt);

  return (
    <FormDrawer open={open} onClose={onClose} title="Integration Details">
      <Stack spacing={2.5}>
        <Row label="Company" value={
          <Box>
            <Typography variant="body2" fontWeight={500}>{integration.companyDisplayName}</Typography>
            <Typography variant="caption" color="text.secondary" fontFamily="monospace">{integration.companyKey}</Typography>
          </Box>
        } />

        <Divider />

        <Row label="Application Name" value={integration.displayName} />
        <Row label="Integration Key"  value={integration.integrationKey} mono />

        {integration.description && (
          <Row label="Description" value={integration.description} />
        )}

        <Row label="Environment" value={
          <Chip
            label={ENV_LABELS[integration.environment] ?? integration.environment}
            size="small"
            color={ENV_COLORS[integration.environment] ?? 'default'}
            variant="outlined"
          />
        } />

        <Divider />

        <Row label="Status" value={<StatusBadge active={integration.isActive} />} />

        <Row label="Token Prefix" value={
          <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem" color="text.secondary">
            {integration.tokenPrefix}…
          </Typography>
        } />

        <Divider />

        <Row label="Last Used"   value={formatRelativeDate(integration.lastUsedAt)} />
        <Row label="Expires At"  value={
          <Typography variant="body2" color={expired ? 'error.main' : 'text.primary'}>
            {formatDate(integration.expiresAt)}{expired ? ' (expired)' : ''}
          </Typography>
        } />
        <Row label="Created At"  value={formatDate(integration.createdAt)} />
        <Row label="Updated At"  value={formatDate(integration.updatedAt)} />
      </Stack>
    </FormDrawer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlatformCompanyIntegrationsPage() {
  const { canViewAllIntegrations } = usePermissions();

  // Companies for filter dropdown
  const { data: companiesData } = useCompanies({ limit: 200 });
  const companies = companiesData?.data ?? [];

  // Filters — all passed to the backend
  const [search,      setSearch]      = useState('');
  const [companyId,   setCompanyId]   = useState('');
  const [envFilter,   setEnvFilter]   = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [expired,     setExpired]     = useState(false);
  const [neverUsed,   setNeverUsed]   = useState(false);
  const [page,        setPage]        = useState(0);
  const pageSize = 50;

  const queryParams = useMemo(() => ({
    search:    search  || undefined,
    companyId: companyId || undefined,
    environment: envFilter || undefined,
    active:    statusFilter === 'active' ? true : statusFilter === 'inactive' ? false : undefined,
    expired:   expired   || undefined,
    neverUsed: neverUsed || undefined,
    limit:     pageSize,
    offset:    page * pageSize,
  }), [search, companyId, envFilter, statusFilter, expired, neverUsed, page]);

  const { data, isLoading, error } = useCompanyIntegrationsPlatform(queryParams);
  const allItems = data?.items ?? [];
  const total    = data?.total  ?? 0;

  const hasActiveFilters = Boolean(search || companyId || envFilter || statusFilter || expired || neverUsed);

  function clearFilters() {
    setSearch(''); setCompanyId(''); setEnvFilter('');
    setStatusFilter(''); setExpired(false); setNeverUsed(false);
    setPage(0);
  }

  // Drawer state
  const [viewTarget,    setViewTarget]    = useState<CompanyIntegrationPlatformView | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<CompanyIntegrationPlatformView | null>(null);
  const [confirmType,   setConfirmType]   = useState<'deactivate' | 'activate'>('deactivate');

  const deactivateMutation = useDeactivateCompanyIntegrationMutation();
  const activateMutation   = useActivateCompanyIntegrationMutation();

  const handleConfirm = useCallback(async () => {
    if (!confirmTarget) return;
    if (confirmType === 'deactivate') {
      await deactivateMutation.mutateAsync(confirmTarget.id);
    } else {
      await activateMutation.mutateAsync(confirmTarget.id);
    }
    setConfirmTarget(null);
  }, [confirmTarget, confirmType, deactivateMutation, activateMutation]);

  function openDeactivate(row: CompanyIntegrationPlatformView) {
    setConfirmTarget(row); setConfirmType('deactivate');
  }
  function openActivate(row: CompanyIntegrationPlatformView) {
    setConfirmTarget(row); setConfirmType('activate');
  }

  // Table columns
  const columns = useMemo<GridColDef<CompanyIntegrationPlatformView>[]>(
    () => [
      {
        field: 'companyDisplayName',
        headerName: 'Company',
        width: 150,
        renderCell: ({ row }) => (
          <Box>
            <Typography variant="body2" fontWeight={500} noWrap>{row.companyDisplayName}</Typography>
            <Typography variant="caption" color="text.secondary" fontFamily="monospace" display="block" noWrap>{row.companyKey}</Typography>
          </Box>
        ),
      },
      {
        field: 'displayName',
        headerName: 'Application Name',
        flex: 1,
        minWidth: 140,
        renderCell: ({ row }) => (
          <Box>
            <Typography variant="body2" fontWeight={500} noWrap>{row.displayName}</Typography>
            {row.description && (
              <Typography variant="caption" color="text.secondary" display="block" noWrap>
                {row.description.slice(0, 45)}{row.description.length > 45 ? '…' : ''}
              </Typography>
            )}
          </Box>
        ),
      },
      {
        field: 'integrationKey',
        headerName: 'Integration Key',
        width: 160,
        renderCell: ({ row }) => (
          <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem" noWrap>
            {row.integrationKey}
          </Typography>
        ),
      },
      {
        field: 'environment',
        headerName: 'Environment',
        width: 120,
        renderCell: ({ row }) => (
          <Chip
            label={ENV_LABELS[row.environment] ?? row.environment}
            size="small"
            color={ENV_COLORS[row.environment] ?? 'default'}
            variant="outlined"
          />
        ),
      },
      {
        field: 'isActive',
        headerName: 'Status',
        width: 95,
        renderCell: ({ row }) => <StatusBadge active={row.isActive} />,
      },
      {
        field: 'lastUsedAt',
        headerName: 'Last Used',
        width: 110,
        renderCell: ({ row }) => (
          <Typography variant="caption" color={row.lastUsedAt ? 'text.secondary' : 'text.disabled'}>
            {formatRelativeDate(row.lastUsedAt)}
          </Typography>
        ),
      },
      {
        field: 'expiresAt',
        headerName: 'Expires At',
        width: 110,
        renderCell: ({ row }) => {
          const exp = isExpired(row.expiresAt);
          return (
            <Typography variant="caption" color={exp ? 'error.main' : 'text.secondary'}>
              {formatDate(row.expiresAt)}
            </Typography>
          );
        },
      },
      {
        field: 'createdAt',
        headerName: 'Created At',
        width: 110,
        renderCell: ({ row }) => (
          <Typography variant="caption" color="text.secondary">
            {formatDate(row.createdAt)}
          </Typography>
        ),
      },
    ],
    [],
  );

  const mobileCardConfig = useMemo<MobileCardConfig<CompanyIntegrationPlatformView>>(
    () => ({
      primaryText: 'displayName',
      secondaryText: (row) => `${row.companyDisplayName} · ${row.integrationKey}`,
      badge: (row) => <StatusBadge active={row.isActive} />,
      fields: [
        {
          field: 'environment',
          label: 'Environment',
          render: (v) => (
            <Chip
              label={ENV_LABELS[v as IntegrationEnvironment] ?? String(v)}
              size="small"
              color={ENV_COLORS[v as IntegrationEnvironment] ?? 'default'}
              variant="outlined"
            />
          ),
        },
        {
          field: 'lastUsedAt',
          label: 'Last Used',
          render: (v) => formatRelativeDate(v as string),
        },
        {
          field: 'expiresAt',
          label: 'Expires At',
          render: (v) => formatDate(v as string),
        },
      ],
    }),
    [],
  );

  const rowActions = useCallback(
    (row: CompanyIntegrationPlatformView) => (
      <PermissionGuard allowed={canViewAllIntegrations}>
        <RowActions>
          <Tooltip title="View details">
            <IconButton size="small" onClick={() => setViewTarget(row)}>
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isActive ? 'Disable integration' : 'Enable integration'}>
            <IconButton
              size="small"
              color={row.isActive ? 'warning' : 'success'}
              onClick={() => row.isActive ? openDeactivate(row) : openActivate(row)}
              disabled={deactivateMutation.isPending || activateMutation.isPending}
            >
              {row.isActive
                ? <BlockOutlinedIcon fontSize="small" />
                : <CheckCircleOutlinedIcon fontSize="small" />
              }
            </IconButton>
          </Tooltip>
        </RowActions>
      </PermissionGuard>
    ),
    [canViewAllIntegrations, deactivateMutation.isPending, activateMutation.isPending],
  );

  return (
    <Box>
      <PageHeader
        title="Company Integrations"
        count={total}
        subtitle="Monitor external applications connected to companies across the platform."
      />

      {/* ── Filter bar ────────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>

          <TextField
            size="small"
            placeholder="Search by name or key…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 240 } }}
          />

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 200 } }}>
            <InputLabel>Company</InputLabel>
            <Select value={companyId} label="Company" onChange={(e) => { setCompanyId(e.target.value); setPage(0); }}>
              <MenuItem value=""><em>All companies</em></MenuItem>
              {companies.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.displayName}
                  <Typography component="span" variant="caption" color="text.secondary" ml={1}>({c.companyKey})</Typography>
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 160 } }}>
            <InputLabel>Environment</InputLabel>
            <Select value={envFilter} label="Environment" onChange={(e) => { setEnvFilter(e.target.value); setPage(0); }}>
              <MenuItem value=""><em>All environments</em></MenuItem>
              <MenuItem value="development">Development</MenuItem>
              <MenuItem value="staging">Staging</MenuItem>
              <MenuItem value="production">Production</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 140 } }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value=""><em>All statuses</em></MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 130 } }}>
            <InputLabel>Expiry</InputLabel>
            <Select
              value={expired ? 'expired' : ''}
              label="Expiry"
              onChange={(e) => { setExpired(e.target.value === 'expired'); setPage(0); }}
            >
              <MenuItem value=""><em>All</em></MenuItem>
              <MenuItem value="expired">Expired only</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 145 } }}>
            <InputLabel>Usage</InputLabel>
            <Select
              value={neverUsed ? 'never' : ''}
              label="Usage"
              onChange={(e) => { setNeverUsed(e.target.value === 'never'); setPage(0); }}
            >
              <MenuItem value=""><em>All</em></MenuItem>
              <MenuItem value="never">Never used</MenuItem>
            </Select>
          </FormControl>

          {hasActiveFilters && (
            <Button
              size="small"
              variant="text"
              startIcon={<ClearOutlinedIcon fontSize="small" />}
              onClick={clearFilters}
              sx={{ width: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <DataTable<CompanyIntegrationPlatformView>
        columns={columns}
        rows={allItems}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={() => {}}
        loading={isLoading}
        error={error instanceof Error ? error : null}
        rowActions={rowActions}
        mobileCardConfig={mobileCardConfig}
        getRowId={(row) => row.id}
        emptyState={
          <EmptyState
            icon={ExtensionOutlinedIcon}
            title={hasActiveFilters ? 'No integrations match your filters' : 'No integrations found'}
            description={
              hasActiveFilters
                ? 'Try adjusting or clearing your filters.'
                : 'No external applications have been connected to any company yet.'
            }
            action={
              hasActiveFilters ? (
                <Button variant="outlined" startIcon={<ClearOutlinedIcon />} onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
        noRowsLabel="No integrations found."
      />

      {/* ── Detail drawer ─────────────────────────────────────────────────── */}
      <DetailDrawer
        open={Boolean(viewTarget)}
        integration={viewTarget}
        onClose={() => setViewTarget(null)}
      />

      {/* ── Disable / Enable confirmation ─────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title={confirmType === 'deactivate' ? 'Disable integration?' : 'Enable integration?'}
        description={
          confirmType === 'deactivate'
            ? `"${confirmTarget?.displayName}" for ${confirmTarget?.companyDisplayName} will be disabled immediately. External systems using this token will lose access until re-enabled.`
            : `"${confirmTarget?.displayName}" for ${confirmTarget?.companyDisplayName} will be re-enabled.`
        }
        confirmLabel={confirmType === 'deactivate' ? 'Disable' : 'Enable'}
        onConfirm={handleConfirm}
        onCancel={() => setConfirmTarget(null)}
        loading={deactivateMutation.isPending || activateMutation.isPending}
        danger={confirmType === 'deactivate'}
      />
    </Box>
  );
}
