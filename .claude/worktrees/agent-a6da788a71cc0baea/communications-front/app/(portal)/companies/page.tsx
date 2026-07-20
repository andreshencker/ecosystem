'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import AddIcon from '@mui/icons-material/Add';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  DataTable,
  StatusBadge,
  EmptyState,
  ConfirmDialog,
  PermissionGuard,
  type MobileCardConfig,
} from '@/components/shared';
import { CompanyForm, CompanyViewDrawer } from '@/components/domain/company';
import {
  useCompanies,
  useCreateCompanyMutation,
  useUpdateCompanyMutation,
  useDeleteCompanyMutation,
} from '@/hooks/api/useCompanies';
import { usePermissions } from '@/hooks/usePermissions';
import type { Company } from '@/types/api';
import type { CreateCompanyFormData, UpdateCompanyFormData } from '@/lib/schemas/company.schema';

// ─── Page state ───────────────────────────────────────────────────────────────

type DrawerMode = 'none' | 'create' | 'view' | 'edit';

const PAGE_SIZE_DEFAULT = 50;

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
      render: (v) =>
        new Date(v as string).toLocaleDateString(undefined, {
          year: 'numeric',
          month: 'short',
          day: 'numeric',
        }),
    },
  ],
};

// ─── Companies page ───────────────────────────────────────────────────────────

export default function CompaniesPage() {
  const { canCreateCompany, canEditCompany, canDeleteCompany } = usePermissions();

  // ── List state ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_DEFAULT);
  const [search, setSearch] = useState('');

  const { data, isLoading, error, refetch } = useCompanies({
    limit: pageSize,
    offset: page * pageSize,
    search: search || undefined,
  });

  const rows = data?.data ?? [];
  const total = data?.total ?? 0;

  // ── Drawer / dialog state ──────────────────────────────────────────────────
  const [drawerMode, setDrawerMode] = useState<DrawerMode>('none');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Company | null>(null);
  const [formError, setFormError] = useState<string | undefined>();

  // ── Mutations ──────────────────────────────────────────────────────────────
  const createMutation = useCreateCompanyMutation();
  const updateMutation = useUpdateCompanyMutation();
  const deleteMutation = useDeleteCompanyMutation();

  // ── Handlers ───────────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setFormError(undefined);
    setSelectedCompany(null);
    setDrawerMode('create');
  }, []);

  const openView = useCallback((company: Company) => {
    setSelectedCompany(company);
    setDrawerMode('view');
  }, []);

  const openEdit = useCallback((company: Company) => {
    setFormError(undefined);
    setSelectedCompany(company);
    setDrawerMode('edit');
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerMode('none');
    setSelectedCompany(null);
    setFormError(undefined);
  }, []);

  const handleCreate = useCallback(
    async (data: CreateCompanyFormData) => {
      try {
        setFormError(undefined);
        await createMutation.mutateAsync(data);
        closeDrawer();
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : 'An unexpected error occurred.';
        setFormError(msg);
      }
    },
    [createMutation, closeDrawer],
  );

  const handleEdit = useCallback(
    async (data: UpdateCompanyFormData) => {
      if (!selectedCompany) return;
      try {
        setFormError(undefined);
        await updateMutation.mutateAsync({ companyKey: selectedCompany.companyKey, ...data });
        closeDrawer();
      } catch (e: unknown) {
        const msg =
          e instanceof Error ? e.message : 'An unexpected error occurred.';
        setFormError(msg);
      }
    },
    [updateMutation, selectedCompany, closeDrawer],
  );

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.companyKey);
      setDeleteTarget(null);
    } catch {
      // error handled by mutation's onError snackbar
    }
  }, [deleteMutation, deleteTarget]);

  // ── Desktop table columns ──────────────────────────────────────────────────
  const columns: GridColDef[] = [
    { field: 'displayName', headerName: 'Name', flex: 1, minWidth: 160 },
    { field: 'companyKey', headerName: 'Key', width: 160 },
    { field: 'timezone', headerName: 'Timezone', width: 180 },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 120,
      renderCell: (params) => <StatusBadge active={params.value as boolean} />,
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 140,
      renderCell: (params) =>
        new Date(params.value as string).toLocaleDateString(),
    },
  ];

  // ── Row actions (desktop hover + mobile card footer) ───────────────────────
  const rowActions = useCallback(
    (row: Company) => (
      <Box display="flex" gap={0.5} onClick={(e) => e.stopPropagation()}>
        <Tooltip title="View details">
          <IconButton size="small" onClick={() => openView(row)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <PermissionGuard allowed={canEditCompany}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(row)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </PermissionGuard>

        <PermissionGuard allowed={canDeleteCompany}>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteTarget(row)}
            >
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </PermissionGuard>
      </Box>
    ),
    [canEditCompany, canDeleteCompany, openView, openEdit],
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box>
      <PageHeader
        title="Companies"
        count={total}
        actions={
          <PermissionGuard allowed={canCreateCompany}>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
            >
              New Company
            </Button>
          </PermissionGuard>
        }
      />

      <DataTable<Company>
        columns={columns}
        rows={rows}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(ps) => { setPageSize(ps); setPage(0); }}
        onRowClick={openView}
        rowActions={rowActions}
        loading={isLoading}
        error={error instanceof Error ? error : null}
        mobileCardConfig={mobileCardConfig}
        getRowId={(row) => row.id}
        noRowsLabel="No companies found."
        emptyState={
          <EmptyState
            icon={BusinessOutlinedIcon}
            title="No companies yet"
            description="Add your first company to start sending notifications."
            action={
              <PermissionGuard allowed={canCreateCompany}>
                <Button variant="contained" onClick={openCreate}>
                  Create Company
                </Button>
              </PermissionGuard>
            }
          />
        }
        filterSlot={
          <TextField
            size="small"
            placeholder="Search companies…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 240 }}
          />
        }
      />

      {/* ── Create drawer ────────────────────────────────────────────────── */}
      <CompanyForm
        mode="create"
        open={drawerMode === 'create'}
        onClose={closeDrawer}
        onSubmit={handleCreate}
        loading={createMutation.isPending}
        error={formError}
      />

      {/* ── View drawer ──────────────────────────────────────────────────── */}
      <CompanyViewDrawer
        open={drawerMode === 'view'}
        company={selectedCompany}
        onClose={closeDrawer}
        onEdit={() => openEdit(selectedCompany!)}
        onDelete={() => {
          setDeleteTarget(selectedCompany);
          closeDrawer();
        }}
      />

      {/* ── Edit drawer ──────────────────────────────────────────────────── */}
      {selectedCompany && (
        <CompanyForm
          mode="edit"
          open={drawerMode === 'edit'}
          onClose={closeDrawer}
          company={selectedCompany}
          onSubmit={handleEdit}
          loading={updateMutation.isPending}
          error={formError}
        />
      )}

      {/* ── Delete confirm dialog ─────────────────────────────────────────── */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title={`Delete "${deleteTarget?.displayName}"?`}
        description="This action cannot be undone. All associated data will be permanently removed."
        confirmLabel="Delete"
        cancelLabel="Cancel"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
