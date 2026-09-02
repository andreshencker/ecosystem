'use client';

import React, { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Checkbox from '@mui/material/Checkbox';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup from '@mui/material/FormGroup';
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
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
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
  useDocumentDomainCatalogues,
  useCreateDocumentDomainCatalogueMutation,
  useUpdateDocumentDomainCatalogueMutation,
  useDeleteDocumentDomainCatalogueMutation,
} from '@/hooks/api/useDocumentDomainCatalogue';
import { usePermissions } from '@/hooks/usePermissions';
import { useListState } from '@/hooks/useListState';
import type { DocumentDomainCatalogue, DocumentFormat } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_FORMATS: DocumentFormat[] = ['pdf', 'xlsx', 'csv', 'html'];

const FORMAT_COLORS: Record<DocumentFormat, 'default' | 'primary' | 'success' | 'warning'> = {
  pdf:  'error' as any,
  xlsx: 'success',
  csv:  'default',
  html: 'primary',
};

// ─── Form schema ──────────────────────────────────────────────────────────────

const slugRegex = /^[a-z0-9_-]+$/;

const domainSchema = z.object({
  domainKey:      z.string().min(1, 'Required').max(100).regex(slugRegex, 'Lowercase, numbers, hyphens only'),
  displayName:    z.string().min(1, 'Required').max(200),
  description:    z.string().max(1000).optional().default(''),
  domainCategory: z.string().min(1, 'Required').max(100),
  allowedFormats: z.array(z.enum(['pdf', 'xlsx', 'csv', 'html'])).default([]),
  isActive:       z.boolean().default(true),
});
type DomainFormValues = z.infer<typeof domainSchema>;

// ─── DocumentDomainDrawer ─────────────────────────────────────────────────────

interface DocumentDomainDrawerProps {
  open: boolean;
  domain: DocumentDomainCatalogue | null;
  companyId: string;
  onClose: () => void;
}

function DocumentDomainDrawer({ open, domain, companyId, onClose }: DocumentDomainDrawerProps) {
  const createMutation = useCreateDocumentDomainCatalogueMutation();
  const updateMutation = useUpdateDocumentDomainCatalogueMutation();
  const isEditing = Boolean(domain);
  const isSystem  = Boolean(domain?.isSystem);

  const form = useForm<DomainFormValues>({
    resolver: zodResolver(domainSchema),
    values: {
      domainKey:      domain?.domainKey      ?? '',
      displayName:    domain?.displayName    ?? '',
      description:    domain?.description    ?? '',
      domainCategory: domain?.domainCategory ?? '',
      allowedFormats: (domain?.allowedFormats ?? []) as DocumentFormat[],
      isActive:       domain?.isActive       ?? true,
    },
  });

  const isPending = createMutation.isPending || updateMutation.isPending;

  async function onSubmit(values: DomainFormValues) {
    if (isEditing && domain) {
      await updateMutation.mutateAsync({
        id: domain.id,
        ...(isSystem ? {} : { displayName: values.displayName, domainCategory: values.domainCategory, description: values.description }),
        allowedFormats: values.allowedFormats,
        isActive: values.isActive,
      });
    } else {
      await createMutation.mutateAsync({
        companyId,
        domainKey:      values.domainKey,
        displayName:    values.displayName,
        description:    values.description,
        domainCategory: values.domainCategory,
        allowedFormats: values.allowedFormats,
      });
    }
    onClose();
  }

  const watchFormats = form.watch('allowedFormats');

  function toggleFormat(fmt: DocumentFormat) {
    const current = form.getValues('allowedFormats') ?? [];
    if (current.includes(fmt)) {
      form.setValue('allowedFormats', current.filter((f) => f !== fmt));
    } else {
      form.setValue('allowedFormats', [...current, fmt]);
    }
  }

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 520 } } }}>
      <Box display="flex" alignItems="center" justifyContent="space-between" px={3} py={2} borderBottom="1px solid" borderColor="divider">
        <Typography variant="h6">{isEditing ? 'Edit Document Domain' : 'New Document Domain'}</Typography>
        <IconButton onClick={onClose} size="small"><CloseOutlinedIcon /></IconButton>
      </Box>

      <Box component="form" onSubmit={form.handleSubmit(onSubmit)} sx={{ flex: 1, overflowY: 'auto', p: 3 }}>
        <Stack spacing={3}>
          {isSystem && (
            <Box sx={{ px: 2, py: 1.25, bgcolor: 'action.hover', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
              <Typography variant="body2" fontWeight={500} gutterBottom>System domain</Typography>
              <Typography variant="caption" color="text.secondary">
                Name, key and category are managed by the platform. You can update allowed formats and active status.
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
                    helperText={form.formState.errors.domainKey?.message ?? 'Unique slug (e.g. invoices). Cannot be changed.'}
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
                    helperText={form.formState.errors.domainCategory?.message ?? 'Groups domains (e.g. finance, hr)'}
                  />
                )}
              />
            </Stack>
          </Box>

          <Divider />

          <Box>
            <Typography variant="caption" color="text.secondary" fontWeight={600} textTransform="uppercase" letterSpacing={0.5} display="block" mb={1.5}>
              Allowed Output Formats
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={1.5}>
              Select which formats documents in this domain can use.
            </Typography>
            <FormGroup>
              {ALL_FORMATS.map((fmt) => (
                <FormControlLabel
                  key={fmt}
                  control={
                    <Checkbox
                      checked={watchFormats?.includes(fmt) ?? false}
                      onChange={() => toggleFormat(fmt)}
                      size="small"
                    />
                  }
                  label={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Chip label={fmt.toUpperCase()} size="small" color={FORMAT_COLORS[fmt]} variant="outlined" sx={{ fontSize: '0.7rem', minWidth: 44 }} />
                      <Typography variant="body2" color="text.secondary">
                        {fmt === 'pdf' ? 'PDF — structured layout documents' :
                         fmt === 'xlsx' ? 'XLSX — spreadsheet reports' :
                         fmt === 'csv' ? 'CSV — raw data export' :
                         'HTML — web-rendered documents'}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </FormGroup>
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

const domainColumns: GridColDef<DocumentDomainCatalogue>[] = [
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
    field: 'domainCategory',
    headerName: 'Category',
    width: 140,
    renderCell: (p) => <Chip label={p.row.domainCategory} size="small" variant="outlined" />,
  },
  {
    field: 'allowedFormats',
    headerName: 'Formats',
    width: 200,
    sortable: false,
    renderCell: (p) => (
      <Box display="flex" gap={0.5} flexWrap="wrap">
        {(p.row.allowedFormats ?? []).map((fmt) => (
          <Chip key={fmt} label={fmt.toUpperCase()} size="small" color={FORMAT_COLORS[fmt as DocumentFormat]} variant="outlined" sx={{ fontSize: '0.65rem' }} />
        ))}
        {(!p.row.allowedFormats || p.row.allowedFormats.length === 0) && (
          <Typography variant="caption" color="text.disabled">None</Typography>
        )}
      </Box>
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

const domainMobileConfig: MobileCardConfig<DocumentDomainCatalogue> = {
  primaryText: 'displayName',
  secondaryText: 'domainKey',
  badge: (row) => <StatusBadge active={row.isActive} size="small" />,
  fields: [
    {
      field: 'domainCategory',
      label: 'Category',
      render: (v) => <Chip label={String(v)} size="small" variant="outlined" />,
    },
    {
      field: 'allowedFormats',
      label: 'Formats',
      render: (v) => (
        <Box display="flex" gap={0.5} flexWrap="wrap">
          {(Array.isArray(v) ? v : []).map((fmt: string) => (
            <Chip key={fmt} label={fmt.toUpperCase()} size="small" color={FORMAT_COLORS[fmt as DocumentFormat]} variant="outlined" sx={{ fontSize: '0.65rem' }} />
          ))}
        </Box>
      ),
    },
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

// ─── DocumentDomainList (main export) ────────────────────────────────────────

interface DocumentDomainListProps {
  companyId: string;
}

export function DocumentDomainList({ companyId }: DocumentDomainListProps) {
  const { canManageDomains } = usePermissions();
  const list = useListState();
  const router = useRouter();

  const { data, isLoading, error } = useDocumentDomainCatalogues(companyId, { limit: 200 });
  const deleteMutation = useDeleteDocumentDomainCatalogueMutation();

  const allDomains = useMemo(() => data?.items ?? [], [data]);

  const categoryFilter = list.filters['category'] ?? '';
  const statusFilter   = list.filters['status']   ?? '';
  const typeFilter     = list.filters['type']     ?? '';
  const formatFilter   = list.filters['format']   ?? '';

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
    if (formatFilter) rows = rows.filter((d) => d.allowedFormats?.includes(formatFilter as DocumentFormat));
    return rows;
  }, [allDomains, list.debouncedSearch, typeFilter, categoryFilter, statusFilter, formatFilter]);

  const [drawerOpen,   setDrawerOpen]   = useState(false);
  const [editTarget,   setEditTarget]   = useState<DocumentDomainCatalogue | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DocumentDomainCatalogue | null>(null);

  const openCreate = useCallback(() => { setEditTarget(null); setDrawerOpen(true); }, []);
  const openEdit   = useCallback((d: DocumentDomainCatalogue) => { setEditTarget(d); setDrawerOpen(true); }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation]);

  const rowActions = useCallback(
    (domain: DocumentDomainCatalogue) => (
      <RowActions>
        <Tooltip title="View Documents">
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation();
              router.push(`/document-catalogue?documentDomainCatalogueId=${domain.id}`);
            }}
          >
            <ArticleOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
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
    [canManageDomains, openEdit, router],
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

        <FormControl size="small" sx={{ minWidth: 115 }}>
          <InputLabel>Format</InputLabel>
          <Select value={formatFilter} label="Format" onChange={(e) => list.setFilter('format', e.target.value)}>
            <MenuItem value="">All formats</MenuItem>
            {ALL_FORMATS.map((f) => <MenuItem key={f} value={f}>{f.toUpperCase()}</MenuItem>)}
          </Select>
        </FormControl>
      </SearchToolbar>

      <DataTable<DocumentDomainCatalogue>
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
        noRowsLabel={list.hasActiveFilters ? 'No domains match your filters.' : 'No document domains configured.'}
        emptyState={
          <EmptyState
            icon={FolderOutlinedIcon}
            title={list.hasActiveFilters ? 'No domains match your filters' : 'No document domains configured'}
            description={
              list.hasActiveFilters
                ? 'Try adjusting your search or clearing the filters.'
                : 'Create a document domain to organise document types and their allowed output formats.'
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

      <DocumentDomainDrawer
        open={drawerOpen}
        domain={editTarget}
        companyId={companyId}
        onClose={closeDrawer}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete document domain?"
        description={
          deleteTarget
            ? `"${deleteTarget.displayName}" (${deleteTarget.domainKey}) and all its documents will be permanently deleted.`
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
