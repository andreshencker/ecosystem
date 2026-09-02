'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import PaletteOutlinedIcon from '@mui/icons-material/PaletteOutlined';
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
import { ThemeForm } from '@/components/domain/theme';
import { useCrudFeedback } from '@/hooks/useCrudFeedback';
import { useUIStore } from '@/stores/ui.store';
import {
  useCompanyThemes,
  useDeleteCompanyThemeMutation,
  useSetDefaultThemeMutation,
} from '@/hooks/api/useCompanyThemes';
import { usePermissions } from '@/hooks/usePermissions';
import { mapApiError } from '@/lib/mapApiError';
import type { CompanyTheme } from '@/types/api';

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE_DEFAULT = 50;

// ─── Small helpers ────────────────────────────────────────────────────────────

function ColorStrip({ theme }: { theme: CompanyTheme }) {
  const swatches = [
    theme.primaryColor,
    theme.secondaryColor,
    theme.backgroundColor,
    theme.textColor,
    theme.borderColor,
  ].filter(Boolean) as string[];

  return (
    <Stack direction="row" spacing={0.5} alignItems="center">
      {swatches.map((c, i) => (
        <Tooltip key={i} title={c}>
          <Box
            sx={{
              width: 14,
              height: 14,
              borderRadius: 0.4,
              bgcolor: c,
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
        </Tooltip>
      ))}
    </Stack>
  );
}

// ─── Mobile card config ───────────────────────────────────────────────────────

const mobileCardConfig: MobileCardConfig<CompanyTheme> = {
  primaryText: 'label',
  badge: (row) => (
    row.isDefault
      ? <Chip icon={<CheckCircleOutlinedIcon />} label="Default" color="success" size="small" variant="outlined" />
      : <StatusBadge active={row.isActive} size="small" />
  ),
  fields: [
    { field: 'primaryColor', label: 'Primary', render: (v) => (
      <Stack direction="row" spacing={0.75} alignItems="center">
        <Box sx={{ width: 14, height: 14, borderRadius: 0.4, bgcolor: v as string, border: '1px solid', borderColor: 'divider' }} />
        <Typography variant="caption">{v as string}</Typography>
      </Stack>
    )},
    { field: 'fontFamily', label: 'Font', render: (v) => (
      <Typography variant="caption" noWrap sx={{ maxWidth: 160 }}>{(v as string) || '—'}</Typography>
    )},
    { field: 'updatedAt', label: 'Updated', render: (v) =>
      new Date(v as string).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    },
  ],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CompanyThemesPage() {
  const { canManageThemes } = usePermissions();
  const pushSnack = useUIStore((s) => s.pushSnack);

  // ── Data — load all themes; filtering + pagination are client-side ──────────
  const { data, isLoading, error } = useCompanyThemes({ limit: 200 });
  const allRows = data?.items ?? [];

  // ── Filter state ────────────────────────────────────────────────────────────
  const [search,        setSearch]        = useState('');
  const [defaultFilter, setDefaultFilter] = useState('');
  const [statusFilter,  setStatusFilter]  = useState('');

  const hasActiveFilters = Boolean(search || defaultFilter || statusFilter);

  function clearFilters() {
    setSearch('');
    setDefaultFilter('');
    setStatusFilter('');
  }

  const filteredRows = useMemo(() => {
    let result = allRows;

    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter((t) =>
        t.label.toLowerCase().includes(q) ||
        (t.fontFamily?.toLowerCase() ?? '').includes(q) ||
        t.primaryColor.toLowerCase().includes(q) ||
        (t.secondaryColor?.toLowerCase() ?? '').includes(q) ||
        (t.backgroundColor?.toLowerCase() ?? '').includes(q) ||
        (t.textColor?.toLowerCase() ?? '').includes(q) ||
        (t.borderColor?.toLowerCase() ?? '').includes(q),
      );
    }

    if (defaultFilter === 'default')     result = result.filter((t) =>  t.isDefault);
    if (defaultFilter === 'not_default') result = result.filter((t) => !t.isDefault);
    if (statusFilter  === 'active')      result = result.filter((t) =>  t.isActive);
    if (statusFilter  === 'inactive')    result = result.filter((t) => !t.isActive);

    return result;
  }, [allRows, search, defaultFilter, statusFilter]);

  // ── Pagination (client-side) ─────────────────────────────────────────────────
  const [page, setPage]         = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);

  const paginatedRows = useMemo(
    () => filteredRows.slice(page * pageSize, (page + 1) * pageSize),
    [filteredRows, page, pageSize],
  );

  function handleSetSearch(value: string) { setSearch(value); setPage(0); }
  function handleSetDefaultFilter(value: string) { setDefaultFilter(value); setPage(0); }
  function handleSetStatusFilter(value: string) { setStatusFilter(value); setPage(0); }
  function handleClearFilters() { clearFilters(); setPage(0); }

  // ── Drawer state ───────────────────────────────────────────────────────────
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editTarget,  setEditTarget]  = useState<CompanyTheme | null>(null);

  const openCreate = useCallback(() => { setEditTarget(null); setDrawerOpen(true); }, []);
  const openEdit   = useCallback((t: CompanyTheme) => { setEditTarget(t); setDrawerOpen(true); }, []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  // ── Delete state ───────────────────────────────────────────────────────────
  const [deleteTarget,  setDeleteTarget]  = useState<CompanyTheme | null>(null);
  const [blockedTarget, setBlockedTarget] = useState<CompanyTheme | null>(null);

  const deleteMutation   = useDeleteCompanyThemeMutation();
  const setDefaultMutation = useSetDefaultThemeMutation();

  const deleteFeedback = useCrudFeedback({
    successMessage: 'Theme deleted',
    queryKeys: [['company-themes']],
    onSuccess: () => setDeleteTarget(null),
  });

  // ── Set default ────────────────────────────────────────────────────────────
  const handleSetDefault = useCallback(async (theme: CompanyTheme) => {
    try {
      await setDefaultMutation.mutateAsync(theme.id);
      pushSnack({ type: 'success', message: `"${theme.label}" is now the default theme.` });
    } catch (e) {
      // Error toast shown by global mutationCache.onError
    }
  }, [setDefaultMutation, pushSnack]);

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDeleteClick = useCallback((theme: CompanyTheme) => {
    if (theme.isDefault) {
      setBlockedTarget(theme);
    } else {
      setDeleteTarget(theme);
    }
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      deleteFeedback.onSuccess();
    } catch (e) {
      setDeleteTarget(null);
      // Error toast shown by global mutationCache.onError
    }
  }, [deleteTarget, deleteMutation, deleteFeedback]);

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns: GridColDef<CompanyTheme>[] = [
    {
      field: 'primaryColor',
      headerName: 'Preview',
      width: 90,
      sortable: false,
      renderCell: ({ row }) => <ColorStrip theme={row} />,
    },
    {
      field: 'label',
      headerName: 'Label',
      flex: 1.5,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Box
            sx={{
              width: 24,
              height: 24,
              borderRadius: 0.75,
              bgcolor: row.primaryColor || 'grey.300',
              border: '1px solid',
              borderColor: 'divider',
              flexShrink: 0,
            }}
          />
          <Typography variant="body2" fontWeight={500} noWrap>
            {row.label}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'colors',
      headerName: 'Colors',
      width: 140,
      sortable: false,
      renderCell: ({ row }) => <ColorStrip theme={row} />,
    },
    {
      field: 'fontFamily',
      headerName: 'Typography',
      width: 170,
      sortable: false,
      renderCell: ({ row }) => (
        <Stack spacing={0}>
          <Typography variant="caption" noWrap sx={{ maxWidth: 160 }}>
            {row.fontFamily || '—'}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            {row.fontSizeBase || ''}{row.fontWeightNormal ? ` · ${row.fontWeightNormal}/${row.fontWeightBold}` : ''}
          </Typography>
        </Stack>
      ),
    },
    {
      field: 'isDefault',
      headerName: 'Default',
      width: 150,
      sortable: false,
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
          <PermissionGuard allowed={canManageThemes}>
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
      field: 'isActive',
      headerName: 'Status',
      width: 100,
      sortable: false,
      renderCell: ({ row }) => <StatusBadge active={row.isActive} size="small" />,
    },
    {
      field: 'updatedAt',
      headerName: 'Updated',
      width: 130,
      renderCell: ({ row }) => (
        <Typography variant="caption" color="text.secondary">
          {new Date(row.updatedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
          })}
        </Typography>
      ),
    },
  ];

  // ── Row actions ────────────────────────────────────────────────────────────
  const rowActions = useCallback(
    (row: CompanyTheme) => (
      <PermissionGuard allowed={canManageThemes}>
        <RowActions>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title={row.isDefault ? 'Cannot delete default theme' : 'Delete'}>
            <span>
              <IconButton
                size="small"
                color="error"
                onClick={() => handleDeleteClick(row)}
                disabled={false}
              >
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </RowActions>
      </PermissionGuard>
    ),
    [canManageThemes, openEdit, handleDeleteClick],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Theme"
        count={filteredRows.length}
        subtitle="Manage branding themes for email and PDF templates."
        actions={
          <PermissionGuard allowed={canManageThemes}>
            <Button
              variant="contained"
              size="small"
              startIcon={<AddIcon />}
              onClick={openCreate}
            >
              New Theme
            </Button>
          </PermissionGuard>
        }
      />

      {/* ── Filter bar ──────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search theme…"
            value={search}
            onChange={(e) => handleSetSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 260 } }}
          />

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 150 } }}>
            <InputLabel>Default</InputLabel>
            <Select value={defaultFilter} label="Default" onChange={(e) => handleSetDefaultFilter(e.target.value)}>
              <MenuItem value=""><em>All</em></MenuItem>
              <MenuItem value="default">Default</MenuItem>
              <MenuItem value="not_default">Not default</MenuItem>
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 140 } }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => handleSetStatusFilter(e.target.value)}>
              <MenuItem value=""><em>All statuses</em></MenuItem>
              <MenuItem value="active">Active</MenuItem>
              <MenuItem value="inactive">Inactive</MenuItem>
            </Select>
          </FormControl>

          {hasActiveFilters && (
            <Button
              size="small"
              variant="text"
              startIcon={<ClearOutlinedIcon fontSize="small" />}
              onClick={handleClearFilters}
              sx={{ width: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      <DataTable
        columns={columns}
        rows={paginatedRows}
        total={filteredRows.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isLoading}
        error={error}
        onRowClick={canManageThemes ? openEdit : undefined}
        rowActions={rowActions}
        mobileCardConfig={mobileCardConfig}
        emptyState={
          allRows.length === 0 ? (
            <EmptyState
              icon={PaletteOutlinedIcon}
              title="No themes yet"
              description="Create a theme to define colours and typography for email and PDF templates."
              action={
                canManageThemes ? (
                  <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                    Create first theme
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <EmptyState
              icon={PaletteOutlinedIcon}
              title="No themes match your filters"
              description="Try adjusting or clearing your filters."
              action={
                <Button variant="outlined" startIcon={<ClearOutlinedIcon />} onClick={handleClearFilters}>
                  Clear filters
                </Button>
              }
            />
          )
        }
        getRowId={(row) => row.id}
      />

      {/* Create / Edit drawer */}
      <ThemeForm
        open={drawerOpen}
        theme={editTarget}
        onClose={closeDrawer}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete theme?"
        description={
          deleteTarget
            ? `"${deleteTarget.label}" will be permanently deleted and cannot be restored.`
            : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Cannot-delete-default info dialog */}
      <Dialog
        open={Boolean(blockedTarget)}
        onClose={() => setBlockedTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Cannot delete default theme</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            <strong>&ldquo;{blockedTarget?.label}&rdquo;</strong> is the default theme for this
            company. To delete it, first set another theme as the default, then come back and
            delete this one.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button variant="contained" onClick={() => setBlockedTarget(null)}>
            Got it
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
