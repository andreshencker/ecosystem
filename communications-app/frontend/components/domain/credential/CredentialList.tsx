'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';
import VerifiedOutlinedIcon from '@mui/icons-material/VerifiedOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  PermissionGuard,
  RowActions,
  SearchToolbar,
  StatusBadge,
  type MobileCardConfig,
} from '@/components/shared';
import { CredentialForm } from './CredentialForm';
import { usePermissions } from '@/hooks/usePermissions';
import { useListState } from '@/hooks/useListState';
import { useUIStore } from '@/stores/ui.store';
import { useCompanyChannelProviders } from '@/hooks/api/useCompanyChannelProviders';
import {
  useAllCompanyCredentials,
  useDeleteCredentialsMutation,
  useTestCredentialsMutation,
} from '@/hooks/api/useProviderCredentials';
import { mapApiError } from '@/lib/mapApiError';
import type { CompanyChannelProvider, ProviderCredentials } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  api_key:      'API Key',
  smtp:         'SMTP',
  oauth:        'OAuth 2.0',
  access_keys:  'Access Keys',
  app_password: 'App Password',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function credProviderName(row: ProviderCredentials): string {
  return row.companyChannelProvider?.provider?.displayName ?? '';
}

function credChannelName(row: ProviderCredentials): string {
  return row.companyChannelProvider?.channel?.displayName ?? '';
}

function credConnectionType(row: ProviderCredentials): string {
  return row.companyChannelProvider?.provider?.connectionType ?? '';
}

// ─── Table columns ────────────────────────────────────────────────────────────

const columns: GridColDef<ProviderCredentials>[] = [
  {
    field: 'tag',
    headerName: 'Tag',
    width: 130,
    renderCell: ({ row }) => (
      <Stack direction="row" spacing={1} alignItems="center">
        <LockOutlinedIcon fontSize="small" color="action" />
        <Typography variant="body2" fontWeight={500} noWrap>{row.tag}</Typography>
      </Stack>
    ),
  },
  {
    field: 'displayIdentifier',
    headerName: 'Identifier / Account',
    flex: 1,
    minWidth: 160,
    sortable: false,
    renderCell: ({ row }) =>
      row.displayIdentifier ? (
        <Typography variant="body2" noWrap>{row.displayIdentifier}</Typography>
      ) : (
        <Typography variant="caption" color="text.disabled">—</Typography>
      ),
  },
  {
    field: 'channel',
    headerName: 'Channel',
    width: 110,
    sortable: false,
    renderCell: ({ row }) => {
      const ch = credChannelName(row);
      return ch
        ? <Chip label={ch} size="small" variant="outlined" />
        : <Typography variant="caption" color="text.disabled">—</Typography>;
    },
  },
  {
    field: 'provider',
    headerName: 'Provider',
    width: 130,
    sortable: false,
    renderCell: ({ row }) => (
      <Typography variant="body2" noWrap>{credProviderName(row) || '—'}</Typography>
    ),
  },
  {
    field: 'connectionType',
    headerName: 'Connection',
    width: 130,
    sortable: false,
    renderCell: ({ row }) => {
      const ct = credConnectionType(row);
      return ct
        ? <Chip label={CONNECTION_TYPE_LABELS[ct] ?? ct} size="small" variant="outlined" />
        : <Typography variant="caption" color="text.disabled">—</Typography>;
    },
  },
  {
    field: 'isActive',
    headerName: 'Status',
    width: 100,
    sortable: false,
    renderCell: ({ row }) => <StatusBadge active={row.isActive ?? true} size="small" />,
  },
  {
    field: 'createdAt',
    headerName: 'Created',
    width: 110,
    renderCell: ({ row }) => (
      <Typography variant="caption" color="text.secondary">
        {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
      </Typography>
    ),
  },
];

// ─── Mobile card config ───────────────────────────────────────────────────────

const mobileCardConfig: MobileCardConfig<ProviderCredentials> = {
  primaryText: 'tag',
  secondaryText: (row) => row.displayIdentifier ?? '',
  badge: (row) => <StatusBadge active={row.isActive ?? true} size="small" />,
  fields: [
    {
      field: 'companyChannelProviderId',
      label: 'Channel',
      render: (_v, row) => <Typography variant="body2">{credChannelName(row) || '—'}</Typography>,
    },
    {
      field: 'companyChannelProvider',
      label: 'Provider',
      render: (_v, row) => <Typography variant="body2">{credProviderName(row) || '—'}</Typography>,
    },
    {
      field: 'createdAt',
      label: 'Created',
      render: (v) => (
        <Typography variant="body2" color="text.secondary">
          {v ? new Date(v as string).toLocaleDateString() : '—'}
        </Typography>
      ),
    },
  ],
};

// ─── CredentialList ───────────────────────────────────────────────────────────

interface CredentialListProps {
  /** The company whose credentials are managed. */
  companyId: string;
}

/**
 * Self-contained credential management list — search, filter, create, edit,
 * delete, test, mobile responsive.
 *
 * Used in:
 *   - /provider-credentials  (own-company view)
 *   - /companies/[id]        (modules-admin cross-company view via Credentials tab)
 */
export function CredentialList({ companyId }: CredentialListProps) {
  const { canManageCredentials } = usePermissions();
  const pushSnack = useUIStore((s) => s.pushSnack);
  const list = useListState();

  // ── Data (load all, filter client-side) ────────────────────────────────────
  const { data: credsData, isLoading, error } = useAllCompanyCredentials(companyId);
  const credentials = credsData?.items ?? [];

  // CCPs for the create form
  const { data: ccpData } = useCompanyChannelProviders(companyId, { populate: true });
  const allCcps = ccpData?.items ?? [];

  // ── Derived filter options ─────────────────────────────────────────────────
  const uniqueCcps = useMemo<Array<{ id: string; label: string }>>(() => {
    const seen = new Set<string>();
    const result: Array<{ id: string; label: string }> = [];
    for (const c of credentials) {
      const id = c.companyChannelProvider?.id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const ch = c.companyChannelProvider?.channel?.displayName ?? '';
      const pr = c.companyChannelProvider?.provider?.displayName ?? '';
      result.push({ id, label: `${ch} — ${pr}` });
    }
    return result.sort((a, b) => a.label.localeCompare(b.label));
  }, [credentials]);

  const availableConnectionTypes = useMemo(() => {
    const seen = new Set<string>();
    for (const c of credentials) {
      const ct = credConnectionType(c);
      if (ct) seen.add(ct);
    }
    return [...seen].sort();
  }, [credentials]);

  // ── Filters (beyond search) ────────────────────────────────────────────────
  const ccpFilter = list.filters['ccp']    ?? '';
  const ctFilter  = list.filters['ct']     ?? '';
  const stFilter  = list.filters['status'] ?? '';

  const filtered = useMemo(() => {
    let rows = credentials;
    if (list.debouncedSearch) {
      const q = list.debouncedSearch.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.tag.toLowerCase().includes(q) ||
          (r.displayIdentifier ?? '').toLowerCase().includes(q) ||
          credProviderName(r).toLowerCase().includes(q) ||
          credChannelName(r).toLowerCase().includes(q),
      );
    }
    if (ccpFilter) rows = rows.filter((r) => r.companyChannelProvider?.id === ccpFilter);
    if (ctFilter)  rows = rows.filter((r) => credConnectionType(r) === ctFilter);
    if (stFilter === 'active')   rows = rows.filter((r) => r.isActive !== false);
    if (stFilter === 'inactive') rows = rows.filter((r) => r.isActive === false);
    return rows;
  }, [credentials, list.debouncedSearch, ccpFilter, ctFilter, stFilter]);

  // ── Drawer ─────────────────────────────────────────────────────────────────
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [editTarget,    setEditTarget]    = useState<ProviderCredentials | null>(null);
  const [drawerProvider, setDrawerProvider] = useState<CompanyChannelProvider | null>(null);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    const prefilled = ccpFilter ? (allCcps.find((p) => p.id === ccpFilter) ?? null) : null;
    setDrawerProvider(prefilled);
    setDrawerOpen(true);
  }, [ccpFilter, allCcps]);

  const openEdit = useCallback((row: ProviderCredentials) => {
    setEditTarget(row);
    const ccpId = row.companyChannelProvider?.id;
    setDrawerProvider(allCcps.find((p) => p.id === ccpId) ?? null);
    setDrawerOpen(true);
  }, [allCcps]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteCredentialsMutation();
  const [deleteTarget, setDeleteTarget] = useState<ProviderCredentials | null>(null);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      setDeleteTarget(null);
      pushSnack({ type: 'success', message: 'Credentials deleted' });
    } catch (e) {
      setDeleteTarget(null);
      pushSnack({ type: 'error', message: mapApiError(e) });
    }
  }, [deleteTarget, deleteMutation, pushSnack]);

  // ── Test ───────────────────────────────────────────────────────────────────
  const testMutation = useTestCredentialsMutation();
  const [testingId, setTestingId] = useState<string | null>(null);

  const handleTest = useCallback(async (id: string) => {
    setTestingId(id);
    try {
      const result = await testMutation.mutateAsync(id);
      pushSnack({
        type: result.success ? 'success' : 'error',
        message: result.success ? `${result.provider}: ${result.message}` : result.message,
      });
    } catch (e) {
      pushSnack({ type: 'error', message: mapApiError(e) });
    } finally {
      setTestingId(null);
    }
  }, [testMutation, pushSnack]);

  // ── Row actions ────────────────────────────────────────────────────────────
  const rowActions = useCallback(
    (row: ProviderCredentials) => (
      <PermissionGuard allowed={canManageCredentials}>
        <RowActions>
          <Tooltip title="Test connection">
            <span>
              <IconButton
                size="small"
                onClick={() => handleTest(row.id)}
                disabled={testingId === row.id}
                color="primary"
              >
                {testingId === row.id
                  ? <CircularProgress size={16} color="primary" />
                  : <VerifiedOutlinedIcon fontSize="small" />}
              </IconButton>
            </span>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </RowActions>
      </PermissionGuard>
    ),
    [canManageCredentials, handleTest, testingId, openEdit],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      {/* ── Create button ───────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="flex-end" mb={1}>
        <PermissionGuard allowed={canManageCredentials}>
          <Button variant="contained" size="small" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            Add Credentials
          </Button>
        </PermissionGuard>
      </Box>

      {/* ── Search + filters ────────────────────────────────────────────────── */}
      <SearchToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search tag, account, provider…"
        hasActiveFilters={list.hasActiveFilters}
        onClearFilters={list.clearFilters}
      >
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Channel Provider</InputLabel>
          <Select value={ccpFilter} label="Channel Provider" onChange={(e) => list.setFilter('ccp', e.target.value)}>
            <MenuItem value="">All providers</MenuItem>
            {uniqueCcps.map((c) => <MenuItem key={c.id} value={c.id}>{c.label}</MenuItem>)}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 145 }}>
          <InputLabel>Connection</InputLabel>
          <Select value={ctFilter} label="Connection" onChange={(e) => list.setFilter('ct', e.target.value)}>
            <MenuItem value="">All types</MenuItem>
            {availableConnectionTypes.map((ct) => (
              <MenuItem key={ct} value={ct}>{CONNECTION_TYPE_LABELS[ct] ?? ct}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 115 }}>
          <InputLabel>Status</InputLabel>
          <Select value={stFilter} label="Status" onChange={(e) => list.setFilter('status', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
      </SearchToolbar>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <DataTable<ProviderCredentials>
        columns={columns}
        rows={filtered}
        total={filtered.length}
        page={list.page}
        pageSize={Math.max(filtered.length, 25)}
        onPageChange={list.setPage}
        onPageSizeChange={() => {}}
        loading={isLoading}
        error={error instanceof Error ? error : null}
        onRowClick={canManageCredentials ? openEdit : undefined}
        rowActions={rowActions}
        mobileCardConfig={mobileCardConfig}
        getRowId={(row) => row.id}
        noRowsLabel={list.hasActiveFilters ? 'No results match your filters.' : 'No credentials configured.'}
        emptyState={
          <EmptyState
            icon={LockOutlinedIcon}
            title={list.hasActiveFilters ? 'No results match your filters' : 'No credentials configured'}
            description={
              list.hasActiveFilters
                ? 'Try adjusting your search or clearing the filters.'
                : 'Add credentials for an enabled provider to start sending notifications.'
            }
            action={
              list.hasActiveFilters ? (
                <Button variant="outlined" onClick={list.clearFilters}>Clear filters</Button>
              ) : (
                <PermissionGuard allowed={canManageCredentials}>
                  <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
                    Add Credentials
                  </Button>
                </PermissionGuard>
              )
            }
          />
        }
      />

      {/* ── CredentialForm drawer ──────────────────────────────────────────── */}
      <CredentialForm
        open={drawerOpen}
        credential={editTarget}
        selectedProvider={drawerProvider}
        companyId={companyId}
        onClose={() => setDrawerOpen(false)}
      />

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete credentials?"
        description={
          deleteTarget
            ? `Credential set "${deleteTarget.tag}" will be permanently deleted. Any domain or event that references these credentials will stop working.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
