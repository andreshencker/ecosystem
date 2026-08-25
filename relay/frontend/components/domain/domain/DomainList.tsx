'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
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
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Drawer from '@mui/material/Drawer';
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
  useDomainCatalogues,
  useCreateDomainCatalogueMutation,
  useUpdateDomainCatalogueMutation,
  useDeleteDomainCatalogueMutation,
  useBulkUpdateDomainCredentialsMutation,
} from '@/hooks/api/useDomainCatalogue';
import { useProviderCredentialOptions } from '@/hooks/api/useProviderCredentials';
import { usePermissions } from '@/hooks/usePermissions';
import { useListState } from '@/hooks/useListState';
import type { DomainCatalogue, ChannelToUse } from '@/types/api';

// ─── Form schemas ─────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9_-]+$/;

const domainSchema = z.object({
  domainKey:      z.string().min(1, 'Required').max(100).regex(slugRegex, 'Lowercase, numbers, hyphens only'),
  displayName:    z.string().min(1, 'Required').max(200),
  domainCategory: z.string().min(1, 'Required').max(100),
  isActive:       z.boolean().optional(),
  emailCredId:    z.string().optional(),
  smsCredId:      z.string().optional(),
});
type DomainFormValues = z.infer<typeof domainSchema>;

const bulkSchema = z.object({
  channel:               z.enum(['email', 'sms']),
  providerCredentialsId: z.string().min(1, 'Select a credential'),
});
type BulkFormValues = z.infer<typeof bulkSchema>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChannelCred(domain: DomainCatalogue, channel: 'email' | 'sms'): string {
  const entry = domain.channelsToUse?.find((c) => c.channel === channel);
  if (!entry) return '—';
  if (typeof entry.providerCredentialsId === 'object') {
    return (entry.providerCredentialsId as { tag?: string }).tag ?? 'Configured';
  }
  return entry.providerCredentialsId ? 'Configured' : '—';
}

function CredChip({ value }: { value: string }) {
  if (value === '—') return <Typography variant="caption" color="text.disabled">—</Typography>;
  return <Chip label={value} size="small" variant="outlined" />;
}

// ─── DomainDrawer (create / edit) ────────────────────────────────────────────

interface DomainDrawerProps {
  open: boolean;
  domain: DomainCatalogue | null;
  companyId: string;
  onClose: () => void;
}

function DomainDrawer({ open, domain, companyId, onClose }: DomainDrawerProps) {
  const createMutation = useCreateDomainCatalogueMutation();
  const updateMutation = useUpdateDomainCatalogueMutation();
  const isEditing = Boolean(domain);
  const isSystem  = Boolean(domain?.isSystem);

  const { data: emailCreds = [] } = useProviderCredentialOptions(companyId, 'email');
  const { data: smsCreds   = [] } = useProviderCredentialOptions(companyId, 'sms');

  const emailCredId = domain?.channelsToUse?.find((c) => c.channel === 'email')
    ?.providerCredentialsId as string | undefined;
  const smsCredId = domain?.channelsToUse?.find((c) => c.channel === 'sms')
    ?.providerCredentialsId as string | undefined;

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    values: {
      domainKey:      domain?.domainKey      ?? '',
      displayName:    domain?.displayName    ?? '',
      domainCategory: domain?.domainCategory ?? '',
      isActive:       domain?.isActive       ?? true,
      emailCredId:    (typeof emailCredId === 'string' ? emailCredId : '') ?? '',
      smsCredId:      (typeof smsCredId   === 'string' ? smsCredId   : '') ?? '',
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: DomainFormValues) {
    const channelsToUse: ChannelToUse[] = [
      ...(values.emailCredId ? [{ channel: 'email' as const, providerCredentialsId: values.emailCredId }] : []),
      ...(values.smsCredId   ? [{ channel: 'sms'   as const, providerCredentialsId: values.smsCredId   }] : []),
    ];

    if (isEditing && domain) {
      await updateMutation.mutateAsync({
        id: domain.id,
        ...(isSystem ? {} : { displayName: values.displayName, domainCategory: values.domainCategory }),
        isActive: values.isActive,
        channelsToUse,
      });
    } else {
      await createMutation.mutateAsync({
        companyId,
        domainKey:      values.domainKey,
        displayName:    values.displayName,
        domainCategory: values.domainCategory,
        channelsToUse,
      });
    }
    onClose();
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" px={3} py={2} borderBottom="1px solid" borderColor="divider">
        <Typography variant="h6">{isEditing ? 'Edit Domain' : 'New Domain'}</Typography>
        <IconButton onClick={onClose} size="small"><CloseOutlinedIcon /></IconButton>
      </Box>

      <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Stack spacing={3}>
          {isSystem && (
            <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight={500} gutterBottom>System domain</Typography>
              <Typography variant="caption" color="text.secondary">
                Name, key and category are managed by the platform. You can update channel credentials and active status.
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
                    helperText={form.formState.errors.domainKey?.message ?? 'Unique slug (e.g. billing). Cannot be changed.'}
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
                name="domainCategory"
                control={form.control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Category"
                    fullWidth size="small" required
                    disabled={isSystem}
                    error={!!form.formState.errors.domainCategory}
                    helperText={form.formState.errors.domainCategory?.message ?? 'Groups domains (e.g. operations, marketing)'}
                  />
                )}
              />
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} display="block" mb={1.5}>
              Channel Credentials
            </Typography>
            <Stack spacing={2}>
              <Controller
                name="emailCredId"
                control={form.control}
                render={({ field }) => (
                  <TextField {...field} select label="Email Credential" fullWidth size="small" helperText="Credential used to send emails from this domain">
                    <MenuItem value="">— None —</MenuItem>
                    {emailCreds.map((c) => <MenuItem key={c.id} value={c.id}>{c.tag}</MenuItem>)}
                  </TextField>
                )}
              />
              <Controller
                name="smsCredId"
                control={form.control}
                render={({ field }) => (
                  <TextField {...field} select label="SMS Credential" fullWidth size="small" helperText="Credential used to send SMS from this domain">
                    <MenuItem value="">— None —</MenuItem>
                    {smsCreds.map((c) => <MenuItem key={c.id} value={c.id}>{c.tag}</MenuItem>)}
                  </TextField>
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

// ─── BulkUpdateDialog ─────────────────────────────────────────────────────────

interface BulkDialogProps {
  open: boolean;
  companyId: string;
  domains: DomainCatalogue[];
  onClose: () => void;
}

function BulkUpdateDialog({ open, companyId, domains, onClose }: BulkDialogProps) {
  const bulkMutation = useBulkUpdateDomainCredentialsMutation();
  const [selectedDomains, setSelectedDomains] = useState<string[]>([]);
  const [applyToAll, setApplyToAll] = useState(true);

  const form = useForm<BulkFormValues>({
    resolver: zodResolver(bulkSchema),
    defaultValues: { channel: 'email', providerCredentialsId: '' },
  });

  const watchChannel = form.watch('channel');
  const { data: credOptions = [] } = useProviderCredentialOptions(companyId, watchChannel);

  async function onSubmit(values: BulkFormValues) {
    const domainIds = applyToAll ? domains.map((d) => d.id) : selectedDomains;
    if (domainIds.length === 0) return;
    await bulkMutation.mutateAsync({ companyId, domainIds, channel: values.channel, providerCredentialsId: values.providerCredentialsId });
    form.reset();
    setSelectedDomains([]);
    onClose();
  }

  function handleClose() {
    form.reset();
    setSelectedDomains([]);
    onClose();
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>Bulk Update Credentials</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <Controller
            name="channel"
            control={form.control}
            render={({ field }) => (
              <TextField {...field} select label="Channel" fullWidth size="small"
                onChange={(e) => { field.onChange(e); form.setValue('providerCredentialsId', ''); }}
              >
                <MenuItem value="email">Email</MenuItem>
                <MenuItem value="sms">SMS</MenuItem>
              </TextField>
            )}
          />
          <Controller
            name="providerCredentialsId"
            control={form.control}
            render={({ field }) => (
              <TextField {...field} select label="New Credential" fullWidth size="small" required
                error={!!form.formState.errors.providerCredentialsId}
                helperText={form.formState.errors.providerCredentialsId?.message}
                disabled={credOptions.length === 0}
              >
                {credOptions.length === 0
                  ? <MenuItem value="" disabled>No credentials for this channel</MenuItem>
                  : credOptions.map((c) => <MenuItem key={c.id} value={c.id}>{c.tag}</MenuItem>)
                }
              </TextField>
            )}
          />
          <Box>
            <FormControlLabel
              control={<Switch checked={applyToAll} onChange={(e) => setApplyToAll(e.target.checked)} />}
              label={`Apply to all ${domains.length} domains`}
            />
            {!applyToAll && (
              <Stack spacing={0.5} mt={1} sx={{ maxHeight: 200, overflowY: 'auto' }}>
                {domains.map((d) => (
                  <FormControlLabel
                    key={d.id}
                    control={
                      <Switch
                        size="small"
                        checked={selectedDomains.includes(d.id)}
                        onChange={(e) =>
                          setSelectedDomains((prev) =>
                            e.target.checked ? [...prev, d.id] : prev.filter((id) => id !== d.id)
                          )
                        }
                      />
                    }
                    label={
                      <Typography variant="body2">
                        {d.displayName}{' '}
                        <Typography component="span" variant="caption" color="text.secondary">
                          ({d.domainKey})
                        </Typography>
                      </Typography>
                    }
                  />
                ))}
              </Stack>
            )}
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>Cancel</Button>
        <Button
          variant="contained"
          onClick={form.handleSubmit(onSubmit)}
          disabled={bulkMutation.isPending || (!applyToAll && selectedDomains.length === 0)}
          startIcon={bulkMutation.isPending ? <CircularProgress size={14} color="inherit" /> : <SyncOutlinedIcon />}
        >
          {bulkMutation.isPending ? 'Updating…' : 'Apply'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Table columns ────────────────────────────────────────────────────────────

const domainColumns: GridColDef<DomainCatalogue>[] = [
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
    field: 'domainCategory',
    headerName: 'Category',
    width: 140,
    renderCell: (p) => <Chip label={p.row.domainCategory} size="small" variant="outlined" />,
  },
  {
    field: '__emailCred__',
    headerName: 'Email',
    width: 120,
    sortable: false,
    renderCell: (p) => <CredChip value={getChannelCred(p.row, 'email')} />,
  },
  {
    field: '__smsCred__',
    headerName: 'SMS',
    width: 110,
    sortable: false,
    renderCell: (p) => <CredChip value={getChannelCred(p.row, 'sms')} />,
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
        {p.row.updatedAt ? new Date(p.row.updatedAt as unknown as string).toLocaleDateString() : '—'}
      </Typography>
    ),
  },
];

// ─── Mobile card config ───────────────────────────────────────────────────────

const domainMobileConfig: MobileCardConfig<DomainCatalogue> = {
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
    {
      field: 'domainCategory',
      label: 'Category',
      render: (v) => <Chip label={String(v)} size="small" variant="outlined" />,
    },
    {
      field: '__emailCred__' as keyof DomainCatalogue,
      label: 'Email',
      render: (_v, row) => <CredChip value={getChannelCred(row, 'email')} />,
    },
    {
      field: '__smsCred__' as keyof DomainCatalogue,
      label: 'SMS',
      render: (_v, row) => <CredChip value={getChannelCred(row, 'sms')} />,
    },
  ],
};

// ─── DomainList (main export) ─────────────────────────────────────────────────

interface DomainListProps {
  /** The company whose domains are managed. */
  companyId: string;
}

/**
 * Self-contained domain management list — search, filter, create, edit, delete,
 * bulk credential update, mobile responsive.
 *
 * Used in:
 *   - /domain-catalogue  (own-company view)
 *   - /companies/[id]    (modules-admin cross-company view via Domains tab)
 */
export function DomainList({ companyId }: DomainListProps) {
  const { canManageDomains } = usePermissions();
  const list = useListState();

  // ── Data (load all, filter client-side — domain counts are always small) ────
  const { data, isLoading, error } = useDomainCatalogues(companyId, { limit: 200 });
  const deleteMutation = useDeleteDomainCatalogueMutation();

  const allDomains = useMemo(() => data?.items ?? [], [data]);

  // ── Additional filters (beyond search) ────────────────────────────────────
  const typeFilter     = list.filters['type']     ?? '';
  const categoryFilter = list.filters['category'] ?? '';
  const statusFilter   = list.filters['status']   ?? '';
  const credFilter     = list.filters['cred']     ?? '';

  const availableCategories = useMemo(() => {
    const seen = new Set<string>();
    for (const d of allDomains) if (d.domainCategory) seen.add(d.domainCategory);
    return [...seen].sort();
  }, [allDomains]);

  const filteredDomains = useMemo(() => {
    let rows = allDomains;
    if (list.debouncedSearch.trim()) {
      const q = list.debouncedSearch.toLowerCase();
      rows = rows.filter(
        (d) =>
          d.domainKey.toLowerCase().includes(q) ||
          d.displayName.toLowerCase().includes(q) ||
          d.domainCategory.toLowerCase().includes(q),
      );
    }
    if (typeFilter === 'system')  rows = rows.filter((d) =>  d.isSystem);
    if (typeFilter === 'company') rows = rows.filter((d) => !d.isSystem);
    if (categoryFilter) rows = rows.filter((d) => d.domainCategory === categoryFilter);
    if (statusFilter === 'active')   rows = rows.filter((d) =>  d.isActive);
    if (statusFilter === 'inactive') rows = rows.filter((d) => !d.isActive);
    if (credFilter === 'email') rows = rows.filter((d) => d.channelsToUse?.some((c) => c.channel === 'email'));
    if (credFilter === 'sms')   rows = rows.filter((d) => d.channelsToUse?.some((c) => c.channel === 'sms'));
    if (credFilter === 'none')  rows = rows.filter((d) => !d.channelsToUse?.length);
    return rows;
  }, [allDomains, list.debouncedSearch, typeFilter, categoryFilter, statusFilter, credFilter]);

  // ── Drawers / dialogs ──────────────────────────────────────────────────────
  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<DomainCatalogue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DomainCatalogue | null>(null);
  const [bulkOpen,     setBulkOpen]     = useState(false);

  const openCreate = useCallback(() => { setEditTarget(null); setDrawerOpen(true); }, []);
  const openEdit   = useCallback((d: DomainCatalogue) => { setEditTarget(d); setDrawerOpen(true); }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation]);

  // ── Row actions ────────────────────────────────────────────────────────────
  const rowActions = useCallback(
    (domain: DomainCatalogue) => (
      <PermissionGuard allowed={canManageDomains}>
        <RowActions>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(domain)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={domain.isSystem ? 'System domains cannot be deleted' : 'Delete'}>
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={() => setDeleteTarget(domain)}
                disabled={domain.isSystem}
              >
                <DeleteOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </RowActions>
      </PermissionGuard>
    ),
    [canManageDomains, openEdit],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box sx={{ minWidth: 0 }}>
      {/* ── Toolbar ─────────────────────────────────────────────────────────── */}
      <Box display="flex" justifyContent="flex-end" gap={1} mb={1}>
        <PermissionGuard allowed={canManageDomains && allDomains.length > 0}>
          <Button variant="outlined" size="small" startIcon={<SyncOutlinedIcon />} onClick={() => setBulkOpen(true)}>
            Bulk Update
          </Button>
        </PermissionGuard>
        <PermissionGuard allowed={canManageDomains}>
          <Button variant="contained" size="small" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
            Add Domain
          </Button>
        </PermissionGuard>
      </Box>

      {/* ── Search + filters ────────────────────────────────────────────────── */}
      <SearchToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search key, name, category…"
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

        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Category</InputLabel>
          <Select value={categoryFilter} label="Category" onChange={(e) => list.setFilter('category', e.target.value)}>
            <MenuItem value="">All categories</MenuItem>
            {availableCategories.map((c) => <MenuItem key={c} value={c}>{c}</MenuItem>)}
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

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel>Credentials</InputLabel>
          <Select value={credFilter} label="Credentials" onChange={(e) => list.setFilter('cred', e.target.value)}>
            <MenuItem value="">All</MenuItem>
            <MenuItem value="email">With email</MenuItem>
            <MenuItem value="sms">With SMS</MenuItem>
            <MenuItem value="none">Without creds</MenuItem>
          </Select>
        </FormControl>
      </SearchToolbar>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <DataTable<DomainCatalogue>
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
        noRowsLabel={list.hasActiveFilters ? 'No domains match your filters.' : 'No domains configured.'}
        emptyState={
          <EmptyState
            icon={AccountTreeOutlinedIcon}
            title={list.hasActiveFilters ? 'No domains match your filters' : 'No domains configured'}
            description={
              list.hasActiveFilters
                ? 'Try adjusting your search or clearing the filters.'
                : 'Create a domain to organize notification events and assign channel credentials.'
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

      {/* ── DomainDrawer ──────────────────────────────────────────────────── */}
      <DomainDrawer
        open={drawerOpen}
        domain={editTarget}
        companyId={companyId}
        onClose={closeDrawer}
      />

      {/* ── BulkUpdateDialog ──────────────────────────────────────────────── */}
      <BulkUpdateDialog
        open={bulkOpen}
        companyId={companyId}
        domains={allDomains}
        onClose={() => setBulkOpen(false)}
      />

      {/* ── Delete confirmation ────────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete domain?"
        description={
          deleteTarget
            ? `"${deleteTarget.displayName}" (${deleteTarget.domainKey}) and all its events will be permanently deleted.`
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
