'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Drawer from '@mui/material/Drawer';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import FolderOutlinedIcon from '@mui/icons-material/FolderOutlined';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  useStorageDomainCatalogues,
  useCreateStorageDomainCatalogueMutation,
  useUpdateStorageDomainCatalogueMutation,
  useDeleteStorageDomainCatalogueMutation,
} from '@/hooks/api/useStorageDomainCatalogue';
import { usePermissions } from '@/hooks/usePermissions';
import { useListState } from '@/hooks/useListState';
import type { StorageDomainCatalogue } from '@/types/api';

// ─── Form schema ──────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9_-]+$/;

const domainSchema = z.object({
  domainKey:   z.string().min(1, 'Required').max(100).regex(slugRegex, 'Lowercase, numbers, hyphens only'),
  displayName: z.string().min(1, 'Required').max(200),
  description: z.string().max(1000).optional().default(''),
  isActive:    z.boolean().default(true),
});
type DomainFormValues = z.infer<typeof domainSchema>;

// ─── StorageDomainDrawer ──────────────────────────────────────────────────────

interface StorageDomainDrawerProps {
  open: boolean;
  domain: StorageDomainCatalogue | null;
  companyId: string;
  onClose: () => void;
}

function StorageDomainDrawer({ open, domain, companyId, onClose }: StorageDomainDrawerProps) {
  const createMutation = useCreateStorageDomainCatalogueMutation();
  const updateMutation = useUpdateStorageDomainCatalogueMutation();
  const isEditing = Boolean(domain);
  const isSystem  = Boolean(domain?.isSystem);

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    values: {
      domainKey:   domain?.domainKey   ?? '',
      displayName: domain?.displayName ?? '',
      description: domain?.description ?? '',
      isActive:    domain?.isActive    ?? true,
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: DomainFormValues) {
    if (isEditing && domain) {
      await updateMutation.mutateAsync({
        id: domain.id,
        ...(isSystem ? {} : { displayName: values.displayName, description: values.description }),
        isActive: values.isActive,
      });
    } else {
      await createMutation.mutateAsync({
        companyId,
        domainKey:   values.domainKey,
        displayName: values.displayName,
        description: values.description,
      });
    }
    onClose();
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" px={3} py={2} borderBottom="1px solid" borderColor="divider">
        <Typography variant="h6">{isEditing ? 'Edit Storage Domain' : 'New Storage Domain'}</Typography>
        <IconButton onClick={onClose} size="small"><CloseOutlinedIcon /></IconButton>
      </Box>

      <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Stack spacing={3}>
          {isSystem && (
            <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight={500} gutterBottom>System domain</Typography>
              <Typography variant="caption" color="text.secondary">
                Name and key are managed by the platform. You can update the active status.
              </Typography>
            </Box>
          )}

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} display="block" mb={1.5}>
              Basic Information
            </Typography>
            <Stack spacing={2}>
              <Controller
                name="domainKey"
                control={form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Domain Key"
                    fullWidth size="small" required
                    disabled={isEditing}
                    error={!!form.formState.errors.domainKey}
                    helperText={form.formState.errors.domainKey?.message ?? 'Unique slug — becomes the top-level bucket folder (e.g. invoices). Cannot be changed.'}
                  />
                )}
              />
              <Controller
                name="displayName"
                control={form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Display Name"
                    fullWidth size="small" required
                    disabled={isSystem}
                    error={!!form.formState.errors.displayName}
                    helperText={form.formState.errors.displayName?.message}
                  />
                )}
              />
              <Controller
                name="description"
                control={form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Description"
                    fullWidth size="small" multiline rows={2}
                    disabled={isSystem}
                    helperText="Optional — internal documentation"
                  />
                )}
              />
            </Stack>
          </Box>

          {isEditing && (
            <>
              <Divider />
              <Controller
                name="isActive"
                control={form.control}
                render={({ field }) => (
                  <FormControlLabel
                    control={<Switch checked={field.value ?? true} onChange={(e) => field.onChange(e.target.checked)} />}
                    label="Active"
                  />
                )}
              />
            </>
          )}
        </Stack>
      </Box>

      <Box px={3} py={2} borderTop="1px solid" borderColor="divider" display="flex" justifyContent="flex-end" gap={1.5}>
        <Button variant="outlined" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={form.handleSubmit(onSubmit)}
          disabled={isPending}
          startIcon={isPending ? <CircularProgress size={14} color="inherit" /> : null}
        >
          {isPending ? 'Saving…' : isEditing ? 'Save Changes' : 'Create Domain'}
        </Button>
      </Box>
    </Drawer>
  );
}

// ─── Table columns ────────────────────────────────────────────────────────────

const domainColumns: GridColDef<StorageDomainCatalogue>[] = [
  {
    field: 'domainKey',
    headerName: 'Domain Key',
    flex: 1,
    minWidth: 130,
    renderCell: (p) => (
      <Typography variant="body2" fontFamily="monospace" fontSize="0.8rem" noWrap>
        {p.row.domainKey}
      </Typography>
    ),
  },
  {
    field: 'displayName',
    headerName: 'Display Name',
    flex: 1.5,
    minWidth: 150,
    renderCell: (p) => (
      <Typography variant="body2" fontWeight={500} noWrap>{p.row.displayName}</Typography>
    ),
  },
  {
    field: 'isSystem',
    headerName: 'Type',
    width: 105,
    sortable: false,
    renderCell: (p) =>
      p.row.isSystem
        ? <Chip label="System"  size="small" color="secondary" variant="outlined" />
        : <Chip label="Company" size="small" color="default"   variant="outlined" />,
  },
  {
    field: 'isActive',
    headerName: 'Status',
    width: 100,
    renderCell: (p) => <StatusBadge active={p.row.isActive} size="small" />,
  },
  {
    field: 'updatedAt',
    headerName: 'Updated',
    width: 110,
    renderCell: (p) => (
      <Typography variant="caption" color="text.secondary">
        {p.row.updatedAt ? new Date(p.row.updatedAt).toLocaleDateString() : '—'}
      </Typography>
    ),
  },
];

// ─── Mobile card config ───────────────────────────────────────────────────────

const domainMobileConfig: MobileCardConfig<StorageDomainCatalogue> = {
  primaryText: 'displayName',
  secondaryText: 'domainKey',
  badge: (row) => <StatusBadge active={row.isActive} size="small" />,
  fields: [
    {
      field: 'isSystem',
      label: 'Type',
      render: (v) =>
        v
          ? <Chip label="System"  size="small" color="secondary" variant="outlined" />
          : <Chip label="Company" size="small" color="default"   variant="outlined" />,
    },
  ],
};

// ─── StorageDomainList (main export) ─────────────────────────────────────────

interface StorageDomainListProps {
  companyId: string;
}

export function StorageDomainList({ companyId }: StorageDomainListProps) {
  const { canManageDomains } = usePermissions();
  const list = useListState();

  const { data, isLoading, error } = useStorageDomainCatalogues(companyId, { limit: 200 });
  const deleteMutation = useDeleteStorageDomainCatalogueMutation();

  const allDomains = useMemo(() => data?.items ?? [], [data]);

  const statusFilter = list.filters['status'] ?? '';
  const typeFilter    = list.filters['type']   ?? '';

  const filteredDomains = useMemo(() => {
    let rows = allDomains;
    if (list.debouncedSearch.trim()) {
      const q = list.debouncedSearch.toLowerCase();
      rows = rows.filter(
        (d) =>
          d.domainKey.toLowerCase().includes(q) ||
          d.displayName.toLowerCase().includes(q),
      );
    }
    if (typeFilter === 'system')  rows = rows.filter((d) =>  d.isSystem);
    if (typeFilter === 'company') rows = rows.filter((d) => !d.isSystem);
    if (statusFilter === 'active')   rows = rows.filter((d) =>  d.isActive);
    if (statusFilter === 'inactive') rows = rows.filter((d) => !d.isActive);
    return rows;
  }, [allDomains, list.debouncedSearch, typeFilter, statusFilter]);

  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<StorageDomainCatalogue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StorageDomainCatalogue | null>(null);

  const openCreate = useCallback(() => { setEditTarget(null); setDrawerOpen(true); }, []);
  const openEdit   = useCallback((d: StorageDomainCatalogue) => { setEditTarget(d); setDrawerOpen(true); }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation]);

  const rowActions = useCallback(
    (domain: StorageDomainCatalogue) => (
      <RowActions>
        <PermissionGuard allowed={canManageDomains}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={(e) => { e.stopPropagation(); openEdit(domain); }}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={domain.isSystem ? 'System domains cannot be deleted' : 'Delete'}>
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={(e) => { e.stopPropagation(); setDeleteTarget(domain); }}
                disabled={domain.isSystem}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </PermissionGuard>
      </RowActions>
    ),
    [canManageDomains, openEdit],
  );

  return (
    <Box sx={{ minWidth: 0 }}>
      <Box display="flex" justifyContent="flex-end" gap={1} mb={1}>
        <PermissionGuard allowed={canManageDomains}>
          <Button variant="contained" size="small" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            Add Domain
          </Button>
        </PermissionGuard>
      </Box>

      <SearchToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search key, name…"
        hasActiveFilters={list.hasActiveFilters}
        onClearFilters={list.clearFilters}
      >
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <InputLabel>Type</InputLabel>
          <Select value={typeFilter} label="Type" onChange={(e) => list.setFilter('type', e.target.value)}>
            <MenuItem value="">All types</MenuItem>
            <MenuItem value="system">System</MenuItem>
            <MenuItem value="company">Company</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 115 }}>
          <InputLabel>Status</InputLabel>
          <Select value={statusFilter} label="Status" onChange={(e) => list.setFilter('status', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>
      </SearchToolbar>

      <DataTable<StorageDomainCatalogue>
        rows={filteredDomains}
        columns={domainColumns}
        total={filteredDomains.length}
        page={list.page}
        pageSize={Math.max(filteredDomains.length, 25)}
        onPageChange={list.setPage}
        onPageSizeChange={() => {}}
        loading={isLoading}
        error={error instanceof Error ? error : null}
        onRowClick={canManageDomains ? openEdit : undefined}
        rowActions={rowActions}
        mobileCardConfig={domainMobileConfig}
        getRowId={(row) => row.id}
        noRowsLabel={list.hasActiveFilters ? 'No domains match your filters.' : 'No storage domains configured.'}
        emptyState={
          <EmptyState
            icon={FolderOutlinedIcon}
            title={list.hasActiveFilters ? 'No domains match your filters' : 'No storage domains configured'}
            description={
              list.hasActiveFilters
                ? 'Try adjusting your search or clearing the filters.'
                : 'Create a storage domain — its key becomes the top-level folder name for files uploaded through files/storage.'
            }
            action={
              list.hasActiveFilters ? (
                <Button variant="outlined" onClick={list.clearFilters}>Clear filters</Button>
              ) : (
                <PermissionGuard allowed={canManageDomains}>
                  <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
                    Add Domain
                  </Button>
                </PermissionGuard>
              )
            }
          />
        }
      />

      <StorageDomainDrawer
        open={drawerOpen}
        domain={editTarget}
        companyId={companyId}
        onClose={closeDrawer}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete storage domain?"
        description={
          deleteTarget
            ? `"${deleteTarget.displayName}" (${deleteTarget.domainKey}) will be permanently deleted. Existing files already uploaded under this folder are not affected.`
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
