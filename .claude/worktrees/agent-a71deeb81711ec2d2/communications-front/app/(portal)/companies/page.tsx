'use client';

import React, { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import OpenInNewOutlinedIcon from '@mui/icons-material/OpenInNewOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  DataTable,
  StatusBadge,
  EmptyState,
  ConfirmDialog,
  PermissionGuard,
  RowActions,
  SearchToolbar,
  type MobileCardConfig,
} from '@/components/shared';
import { CompanyForm, CreateCompanyOwnerForm } from '@/components/domain/company';
import {
  useCompanies,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
  useCreateCompanyWithOwnerMutation,
} from '@/hooks/api/useCompanies';
import { usePermissions } from '@/hooks/usePermissions';
import { useListState } from '@/hooks/useListState';
import type { Company } from '@/types/api';
import type { UpdateCompanyFormData, CreateCompanyWithOwnerFormData } from '@/lib/schemas/company.schema';

// ─── Types ────────────────────────────────────────────────────────────────────

type DrawerMode = 'none' | 'create' | 'edit';

// ─── Mobile card config ───────────────────────────────────────────────────────

const mobileCardConfig: MobileCardConfig<Company> = {
  primaryText: 'displayName',
  secondaryText: 'companyKey',
  badge: (row) => <StatusBadge active={row.isActive} size="small" />,
  fields: [
    { field: 'timezone', label: 'Timezone' },
    {
      field: 'createdAt',
      label: 'Created',
      render: (v) => new Date(v as string).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }),
    },
  ],
};

// ─── Status filter options ────────────────────────────────────────────────────

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

// ─── Companies page ───────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const router = useRouter();
  const { canCreateCompany, canEditCompany, canDeleteCompany } = usePermissions();

  // ── List state ─────────────────────────────────────────────────────────────
  const list = useListState({ defaultPageSize: 50 });
  const statusFilter = list.filters['status'] ?? '';

  // Resolve active filter for the API (tri-state: all / active / inactive)
  const activeParam =
    statusFilter === 'active' ? true :
    statusFilter === 'inactive' ? false :
    undefined;

  const { data, isLoading, error } = useCompanies({
    limit: list.pageSize,
    offset: list.page * list.pageSize,
    search: list.debouncedSearch || undefined,
    active: activeParam,
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  // ── Drawer / dialog state ──────────────────────────────────────────────────
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('none');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [formError, setFormError] = useState<string | undefined>();

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createWithOwnerMutation = useCreateCompanyWithOwnerMutation();
  const updateMutation = useUpdateCompanyMutation();
  const deleteMutation = useDeleteCompanyMutation();

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setFormError(undefined);
    setDrawerMode('create');
  }, []);

  const openEdit = useCallback((company: Company, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFormError(undefined);
    setSelectedCompany(company);
    setDrawerMode('edit');
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerMode('none');
    setSelectedCompany(null);
    setFormError(undefined);
  }, []);

  const navigateToDetail = useCallback((company: Company) => {
    router.push(`/companies/${company.id}`);
  }, [router]);

  const handleCreate = useCallback(async (data: CreateCompanyWithOwnerFormData) => {
    try {
      setFormError(undefined);
      await createWithOwnerMutation.mutateAsync(data);
      closeDrawer();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    }
  }, [createWithOwnerMutation, closeDrawer]);

  const handleEdit = useCallback(async (data: UpdateCompanyFormData) => {
    if (!selectedCompany) return;
    try {
      setFormError(undefined);
      await updateMutation.mutateAsync({ companyKey: selectedCompany.companyKey, ...data });
      closeDrawer();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    }
  }, [updateMutation, selectedCompany, closeDrawer]);

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.companyKey);
    } finally {
      setDeleteTarget(null);
    }
  }, [deleteMutation, deleteTarget]);

  // ── Desktop columns ────────────────────────────────────────────────────────
  const columns: GridColDef<Company>[] = [
    {
      field: 'displayName',
      headerName: 'Name',
      flex: 1,
      minWidth: 160,
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={500} noWrap>
          {p.value as string}
        </Typography>
      ),
    },
    {
      field: 'companyKey',
      headerName: 'Key',
      width: 180,
      renderCell: (p) => (
        <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize={12} noWrap>
          {p.value as string}
        </Typography>
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 110,
      renderCell: (p) => <StatusBadge active={p.value as boolean} />,
    },
    {
      field: 'timezone',
      headerName: 'Timezone',
      width: 170,
      renderCell: (p) => (
        <Typography variant="body2" color="text.secondary" noWrap>{p.value as string}</Typography>
      ),
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 120,
      renderCell: (p) => new Date(p.value as string).toLocaleDateString(),
    },
  ];

  // ── Row actions ────────────────────────────────────────────────────────────
  const rowActions = useCallback(
    (row: Company) => (
      <RowActions>
        <Tooltip title="View details">
          <IconButton size="small" onClick={() => navigateToDetail(row)}>
            <OpenInNewOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <PermissionGuard allowed={canEditCompany}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={(e) => openEdit(row, e)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </PermissionGuard>

        <PermissionGuard allowed={canDeleteCompany}>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
            >
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </PermissionGuard>
      </RowActions>
    ),
    [canEditCompany, canDeleteCompany, navigateToDetail, openEdit],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Companies"
        count={total}
        actions={
          <PermissionGuard allowed={canCreateCompany}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
              New Company
            </Button>
          </PermissionGuard>
        }
      />

      <SearchToolbar
        search={list.search}
        onSearchChange={list.setSearch}
        placeholder="Search companies…"
        hasActiveFilters={list.hasActiveFilters}
        onClearFilters={list.clearFilters}
      >
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Status</InputLabel>
          <Select
            value={statusFilter}
            label="Status"
            onChange={(e) => list.setFilter('status', e.target.value)}
          >
            {STATUS_OPTIONS.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </SearchToolbar>

      <DataTable<Company>
        columns={columns}
        rows={rows}
        total={total}
        page={list.page}
        pageSize={list.pageSize}
        onPageChange={list.setPage}
        onPageSizeChange={(ps) => { list.setPageSize(ps); list.setPage(0); }}
        onRowClick={navigateToDetail}
        rowActions={rowActions}
        loading={isLoading}
        error={error instanceof Error ? error : null}
        mobileCardConfig={mobileCardConfig}
        getRowId={(row) => row.id}
        noRowsLabel="No companies found."
        emptyState={
          <EmptyState
            icon={BusinessOutlinedIcon}
            title={list.hasActiveFilters ? 'No companies match your filters' : 'No companies yet'}
            description={
              list.hasActiveFilters
                ? 'Try adjusting your search or clearing the filters.'
                : 'Create your first company to start sending notifications.'
            }
            action={
              list.hasActiveFilters ? (
                <Button variant="outlined" onClick={list.clearFilters}>Clear filters</Button>
              ) : (
                <PermissionGuard allowed={canCreateCompany}>
                  <Button variant="contained" onClick={openCreate}>New Company</Button>
                </PermissionGuard>
              )
            }
          />
        }
      />

      {/* ── Create company + owner drawer ─────────────────────────────────── */}
      <CreateCompanyOwnerForm
        open={drawerMode === 'create'}
        onClose={closeDrawer}
        onSubmit={handleCreate}
        loading={createWithOwnerMutation.isPending}
        error={formError}
      />

      {/* ── Edit drawer ──────────────────────────────────────────────────── */}
      {selectedCompany && (
        <CompanyForm
          mode="edit"
          open={drawerMode === 'edit'}
          company={selectedCompany}
          onClose={closeDrawer}
          onSubmit={handleEdit}
          loading={updateMutation.isPending}
          error={formError}
        />
      )}

      {/* ── Delete confirm ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete "${deleteTarget?.displayName}"?`}
        description="This action cannot be undone. All associated data will be permanently removed."
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
