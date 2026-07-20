'use client';

import React, { useState, useCallback, useMemo } from 'react';
import axios from 'axios';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import FormControl from '@mui/material/FormControl';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HubOutlinedIcon from '@mui/icons-material/HubOutlined';
import SearchIcon from '@mui/icons-material/Search';
import StarBorderOutlinedIcon from '@mui/icons-material/StarBorderOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  PermissionGuard,
  RowActions,
  StatusBadge,
  type MobileCardConfig,
} from '@/components/shared';
import { ChannelProviderForm } from '@/components/domain/channel-provider';
import { useAuthStore } from '@/stores/auth.store';
import { useUIStore } from '@/stores/ui.store';
import { usePermissions } from '@/hooks/usePermissions';
import { useQueryClient } from '@tanstack/react-query';
import {
  useCompanyChannelProviders,
  useDeleteChannelProviderMutation,
  useSetDefaultChannelProviderMutation,
} from '@/hooks/api/useCompanyChannelProviders';
import { mapApiError } from '@/lib/mapApiError';
import type { CompanyChannelProvider, Channel, Provider } from '@/types/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const CONNECTION_TYPE_LABELS: Record<string, string> = {
  api_key:      'API Key',
  smtp:         'SMTP',
  oauth:        'OAuth',
  access_keys:  'Access Keys',
  app_password: 'App Password',
};

function getChannelName(item: CompanyChannelProvider): string {
  return item.channel?.displayName ?? String(item.channelId);
}

function getProviderName(item: CompanyChannelProvider): string {
  return item.provider?.displayName ?? String(item.providerId);
}

function getConnectionType(item: CompanyChannelProvider): string {
  return item.provider?.connectionType ?? '';
}

function isCredentialsConflict(error: unknown): boolean {
  return (
    axios.isAxiosError(error) &&
    error.response?.status === 409 &&
    (error.response.data as Record<string, unknown>)?.hasCredentials === true
  );
}

function getCredentialCount(error: unknown): number {
  if (!axios.isAxiosError(error)) return 0;
  return Number((error.response?.data as Record<string, unknown>)?.credentialCount ?? 0);
}

// ─── Filter state ─────────────────────────────────────────────────────────────

interface FilterState {
  search:         string;
  channelId:      string;
  connectionType: string;
  status:         '' | 'active' | 'inactive';
  isDefault:      '' | 'default' | 'non-default';
}

const EMPTY_FILTERS: FilterState = {
  search: '', channelId: '', connectionType: '', status: '', isDefault: '',
};

function hasActiveFilters(f: FilterState): boolean {
  return Object.values(f).some(Boolean);
}

// ─── Delete dialog state ──────────────────────────────────────────────────────

type DeleteStage = 'confirm' | 'cascade';

interface DeleteDialog {
  target:          CompanyChannelProvider;
  stage:           DeleteStage;
  credentialCount: number;
}

// ─── Mobile card config ───────────────────────────────────────────────────────

const mobileCardConfig: MobileCardConfig<CompanyChannelProvider> = {
  primaryText:   (row) => getProviderName(row),
  secondaryText: (row) => getChannelName(row),
  badge: (row) =>
    row.isDefault
      ? <Chip icon={<CheckCircleOutlinedIcon />} label="Default" color="success" size="small" variant="outlined" />
      : <StatusBadge active={row.isActive} size="small" />,
  fields: [
    {
      field: 'providerId',
      label: 'Connection',
      render: (_v, row) => {
        const ct = getConnectionType(row);
        return ct ? (
          <Chip label={CONNECTION_TYPE_LABELS[ct] ?? ct} size="small" variant="outlined" />
        ) : (
          <Typography variant="body2" color="text.disabled">—</Typography>
        );
      },
    },
    {
      field: 'isActive',
      label: 'Status',
      render: (_v, row) => <StatusBadge active={row.isActive} size="small" />,
    },
    {
      field: 'updatedAt',
      label: 'Updated',
      render: (v) =>
        new Date(v as string).toLocaleDateString(undefined, {
          year: 'numeric', month: 'short', day: 'numeric',
        }),
    },
  ],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ChannelProvidersPage() {
  const companyId          = useAuthStore((s) => s.companyId);
  const { canManageCredentials } = usePermissions();
  const pushSnack          = useUIStore((s) => s.pushSnack);
  const queryClient        = useQueryClient();

  // ── Data ───────────────────────────────────────────────────────────────────
  const { data, isLoading, error, refetch } = useCompanyChannelProviders(companyId);
  const items = data?.items ?? [];

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [page, setPage]         = useState(0);
  const [pageSize, setPageSize] = useState(50);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);

  function updateFilter(key: keyof FilterState, value: string) {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPage(0);
  }

  function clearFilters() {
    setFilters(EMPTY_FILTERS);
    setPage(0);
  }

  // Derived channel and connection-type options from live data
  const channelOptions = useMemo(() => {
    const seen = new Set<string>();
    return items
      .filter((item) => {
        const id = item.channel?.id ?? String(item.channelId);
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((item) => ({
        id:    item.channel?.id ?? String(item.channelId),
        label: getChannelName(item),
      }));
  }, [items]);

  const connectionTypeOptions = useMemo(() => {
    const types = new Set(items.map(getConnectionType).filter(Boolean));
    return Array.from(types);
  }, [items]);

  // Client-side filtering
  const filteredItems = useMemo(() => {
    let result = items;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      result = result.filter(
        (i) =>
          getProviderName(i).toLowerCase().includes(q) ||
          getChannelName(i).toLowerCase().includes(q),
      );
    }
    if (filters.channelId) {
      result = result.filter(
        (i) =>
          (i.channel?.id ?? String(i.channelId)) === filters.channelId,
      );
    }
    if (filters.connectionType) {
      result = result.filter((i) => getConnectionType(i) === filters.connectionType);
    }
    if (filters.status === 'active')   result = result.filter((i) =>  i.isActive);
    if (filters.status === 'inactive') result = result.filter((i) => !i.isActive);
    if (filters.isDefault === 'default')     result = result.filter((i) =>  i.isDefault);
    if (filters.isDefault === 'non-default') result = result.filter((i) => !i.isDefault);
    return result;
  }, [items, filters]);

  const pagedItems = useMemo(
    () => filteredItems.slice(page * pageSize, (page + 1) * pageSize),
    [filteredItems, page, pageSize],
  );

  // ── Drawer ─────────────────────────────────────────────────────────────────
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [drawerMode,  setDrawerMode]  = useState<'create' | 'edit'>('create');
  const [editTarget,  setEditTarget]  = useState<CompanyChannelProvider | null>(null);

  const openCreate = useCallback(() => {
    setEditTarget(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((item: CompanyChannelProvider) => {
    setEditTarget(item);
    setDrawerMode('edit');
    setDrawerOpen(true);
  }, []);

  // ── Set default ────────────────────────────────────────────────────────────
  const setDefaultMutation = useSetDefaultChannelProviderMutation();

  const handleSetDefault = useCallback(async (item: CompanyChannelProvider) => {
    try {
      await setDefaultMutation.mutateAsync(item.id);
      pushSnack({ type: 'success', message: `"${getProviderName(item)}" is now the default for ${getChannelName(item)}.` });
    } catch {
      // error toast handled by global mutationCache.onError
    }
  }, [setDefaultMutation, pushSnack]);

  // ── Delete (two-stage) ─────────────────────────────────────────────────────
  const deleteMutation = useDeleteChannelProviderMutation();
  const [deleteDialog, setDeleteDialog] = useState<DeleteDialog | null>(null);

  const handleDeleteClick = useCallback((item: CompanyChannelProvider) => {
    setDeleteDialog({ target: item, stage: 'confirm', credentialCount: 0 });
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteDialog) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteDialog.target.id });
      setDeleteDialog(null);
      pushSnack({ type: 'success', message: 'Provider removed' });
      queryClient.invalidateQueries({ queryKey: ['company-channel-providers'] });
    } catch (e) {
      if (isCredentialsConflict(e)) {
        setDeleteDialog((prev) =>
          prev ? { ...prev, stage: 'cascade', credentialCount: getCredentialCount(e) } : null,
        );
      } else {
        setDeleteDialog(null);
        pushSnack({ type: 'error', message: mapApiError(e) });
      }
    }
  }, [deleteDialog, deleteMutation, pushSnack, queryClient]);

  const handleCascadeConfirm = useCallback(async () => {
    if (!deleteDialog) return;
    try {
      await deleteMutation.mutateAsync({ id: deleteDialog.target.id, force: true });
      setDeleteDialog(null);
      pushSnack({ type: 'success', message: `Provider and ${deleteDialog.credentialCount} credential(s) removed.` });
      queryClient.invalidateQueries({ queryKey: ['company-channel-providers'] });
    } catch (e) {
      setDeleteDialog(null);
      pushSnack({ type: 'error', message: mapApiError(e) });
    }
  }, [deleteDialog, deleteMutation, pushSnack, queryClient]);

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns: GridColDef<CompanyChannelProvider>[] = useMemo(() => [
    {
      field:      'channelId',
      headerName: 'Channel',
      flex:       1,
      minWidth:   110,
      renderCell: ({ row }) => (
        <Typography variant="body2" fontWeight={500} noWrap>
          {getChannelName(row)}
        </Typography>
      ),
    },
    {
      field:      'providerId',
      headerName: 'Provider',
      flex:       1.2,
      minWidth:   130,
      renderCell: ({ row }) => (
        <Typography variant="body2" noWrap>
          {getProviderName(row)}
        </Typography>
      ),
    },
    {
      field:      'connectionType',
      headerName: 'Connection Type',
      width:      140,
      sortable:   false,
      renderCell: ({ row }) => {
        const ct = getConnectionType(row);
        return ct ? (
          <Chip label={CONNECTION_TYPE_LABELS[ct] ?? ct} size="small" variant="outlined" />
        ) : (
          <Typography variant="caption" color="text.disabled">—</Typography>
        );
      },
    },
    {
      field:      'isDefault',
      headerName: 'Default',
      width:      150,
      sortable:   false,
      renderCell: ({ row }) =>
        row.isDefault ? (
          <Chip
            icon={<CheckCircleOutlinedIcon />}
            label="Default"
            color="success"
            size="small"
            variant="outlined"
          />
        ) : (
          <PermissionGuard allowed={canManageCredentials}>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<StarBorderOutlinedIcon />}
              onClick={(e) => { e.stopPropagation(); handleSetDefault(row); }}
              disabled={setDefaultMutation.isPending}
              sx={{ fontSize: '0.7rem', py: 0.3, px: 1 }}
            >
              Set Default
            </Button>
          </PermissionGuard>
        ),
    },
    {
      field:      'isActive',
      headerName: 'Status',
      width:      100,
      sortable:   false,
      renderCell: ({ row }) => <StatusBadge active={row.isActive} size="small" />,
    },
    {
      field:      'updatedAt',
      headerName: 'Updated',
      width:      130,
      renderCell: ({ row }) => (
        <Typography variant="caption" color="text.secondary">
          {new Date(row.updatedAt).toLocaleDateString(undefined, {
            year: 'numeric', month: 'short', day: 'numeric',
          })}
        </Typography>
      ),
    },
  ], [canManageCredentials, handleSetDefault, setDefaultMutation.isPending]);

  // ── Row actions ────────────────────────────────────────────────────────────
  const rowActions = useCallback(
    (row: CompanyChannelProvider) => (
      <PermissionGuard allowed={canManageCredentials}>
        <RowActions>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove">
            <IconButton size="small" color="error" onClick={() => handleDeleteClick(row)}>
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </RowActions>
      </PermissionGuard>
    ),
    [canManageCredentials, openEdit, handleDeleteClick],
  );

  // ── Filter bar ─────────────────────────────────────────────────────────────
  // Matches the Global Users filter bar pattern:
  // Paper container + display:flex/flexWrap/gap + explicit width per control.
  const filterBar = (
    <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>

        {/* Channel */}
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 180 } }}>
          <InputLabel>Channel</InputLabel>
          <Select
            value={filters.channelId}
            label="Channel"
            onChange={(e) => updateFilter('channelId', e.target.value)}
          >
            <MenuItem value=""><em>All channels</em></MenuItem>
            {channelOptions.map((ch) => (
              <MenuItem key={ch.id} value={ch.id}>{ch.label}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Search */}
        <TextField
          size="small"
          placeholder="Search provider or channel…"
          value={filters.search}
          onChange={(e) => updateFilter('search', e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ width: { xs: '100%', sm: 280 } }}
        />

        {/* Connection type */}
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 175 } }}>
          <InputLabel>Connection type</InputLabel>
          <Select
            value={filters.connectionType}
            label="Connection type"
            onChange={(e) => updateFilter('connectionType', e.target.value)}
          >
            <MenuItem value=""><em>All types</em></MenuItem>
            {connectionTypeOptions.map((ct) => (
              <MenuItem key={ct} value={ct}>{CONNECTION_TYPE_LABELS[ct] ?? ct}</MenuItem>
            ))}
          </Select>
        </FormControl>

        {/* Status */}
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 130 } }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={filters.status}
            label="Status"
            onChange={(e) => updateFilter('status', e.target.value as FilterState['status'])}
          >
            <MenuItem value=""><em>All</em></MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        {/* Default */}
        <FormControl size="small" sx={{ width: { xs: '100%', sm: 165 } }}>
          <InputLabel>Default</InputLabel>
          <Select
            value={filters.isDefault}
            label="Default"
            onChange={(e) => updateFilter('isDefault', e.target.value as FilterState['isDefault'])}
          >
            <MenuItem value=""><em>All</em></MenuItem>
            <MenuItem value="default">Default only</MenuItem>
            <MenuItem value="non-default">Non-default only</MenuItem>
          </Select>
        </FormControl>

        {/* Clear — only visible when at least one filter is active */}
        {hasActiveFilters(filters) && (
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
  );

  // ── Empty states ───────────────────────────────────────────────────────────
  const noDataEmpty = (
    <EmptyState
      icon={HubOutlinedIcon}
      title="No providers configured"
      description="Enable a platform provider to start sending notifications on each channel."
      action={
        canManageCredentials ? (
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Enable first provider
          </Button>
        ) : undefined
      }
    />
  );

  const noResultsEmpty = (
    <Box textAlign="center" py={6}>
      <Typography variant="h6" color="text.primary" gutterBottom>
        No matching results
      </Typography>
      <Typography variant="body2" color="text.secondary" mb={2}>
        No providers match the active filters.
      </Typography>
      <Button variant="outlined" onClick={clearFilters}>
        Clear filters
      </Button>
    </Box>
  );

  const emptyState = items.length === 0 ? noDataEmpty : noResultsEmpty;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Enabled Providers"
        count={filteredItems.length}
        subtitle="Select which platform providers your company uses for each channel."
        actions={
          <PermissionGuard allowed={canManageCredentials}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              Enable Provider
            </Button>
          </PermissionGuard>
        }
      />

      <DataTable<CompanyChannelProvider>
        columns={columns}
        rows={pagedItems}
        total={filteredItems.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        loading={isLoading}
        error={error}
        onRowClick={canManageCredentials ? openEdit : undefined}
        rowActions={rowActions}
        mobileCardConfig={mobileCardConfig}
        filterSlot={filterBar}
        emptyState={emptyState}
        noRowsLabel="No providers configured."
        getRowId={(row) => row.id}
      />

      {/* Create / Edit drawer */}
      {companyId && (
        <ChannelProviderForm
          open={drawerOpen}
          mode={drawerMode}
          existing={editTarget ?? undefined}
          companyId={companyId}
          onClose={() => setDrawerOpen(false)}
        />
      )}

      {/* Stage 1: standard delete confirm */}
      <ConfirmDialog
        open={deleteDialog?.stage === 'confirm'}
        title="Remove provider?"
        description={
          deleteDialog
            ? `Removing "${getProviderName(deleteDialog.target)}" from ${getChannelName(deleteDialog.target)} may break active notification flows.`
            : ''
        }
        confirmLabel="Remove"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog(null)}
      />

      {/* Stage 2: cascade delete confirm (provider has credentials) */}
      <Dialog
        open={deleteDialog?.stage === 'cascade'}
        onClose={() => setDeleteDialog(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>This provider has credentials</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>
              &ldquo;{deleteDialog ? getProviderName(deleteDialog.target) : ''}&rdquo;
            </strong>{' '}
            has{' '}
            <strong>{deleteDialog?.credentialCount ?? 0} credential(s)</strong> configured.
            Deleting this provider will also permanently remove its credentials.
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={1}>
            This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
          <Button variant="outlined" onClick={() => setDeleteDialog(null)}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleCascadeConfirm}
            disabled={deleteMutation.isPending}
          >
            {deleteMutation.isPending ? 'Removing…' : 'Remove provider and credentials'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
