'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  DataTable,
  EmptyState,
  ConfirmDialog,
  PermissionGuard,
  StatusBadge,
  RowActions,
  type MobileCardConfig,
} from '@/components/shared';
import { UserViewDrawer, UserEditForm } from '@/components/domain/user';
import { CreateCompanyOwnerForm } from '@/components/domain/company';
import {
  useUsers,
  useUpdateUserMutation,
  useDeactivateUserMutation,
  useReactivateUserMutation,
  useDeleteUserMutation,
} from '@/hooks/api/useUsers';
import { useCompanies, useCreateCompanyWithOwnerMutation } from '@/hooks/api/useCompanies';
import { usePermissions } from '@/hooks/usePermissions';
import type { Company, User } from '@/types/api';
import type { UpdateUserFormData } from '@/lib/schemas/user.schema';
import type { CreateCompanyWithOwnerFormData } from '@/lib/schemas/company.schema';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  company_owner:  'Owner',
  company_admin:  'Admin',
  operator:       'Operator',
  viewer:         'Viewer',
};

// Global Users page only manages modules-level roles
const GLOBAL_ROLE_FILTERS = [
  { value: 'platform_admin', label: 'Platform Admin' },
  { value: 'company_owner',  label: 'Company Owner'  },
];

const PAGE_SIZE_DEFAULT = 50;

// ─── Types ────────────────────────────────────────────────────────────────────

type DrawerMode = 'none' | 'view' | 'edit' | 'create-company';

type ConfirmAction =
  | { type: 'deactivate'; user: User }
  | { type: 'reactivate'; user: User }
  | { type: 'delete'; user: User }
  | null;

// ─── Mobile card config ───────────────────────────────────────────────────────

const mobileCardConfig: MobileCardConfig<User> = {
  primaryText: (row) => [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
  secondaryText: 'email',
  badge: (row) => <StatusBadge active={row.isActive} size="small" />,
  fields: [
    { field: 'role', label: 'Role', render: (v) => ROLE_LABELS[v as string] ?? String(v) },
    {
      field: 'createdAt',
      label: 'Created',
      render: (v) => v ? new Date(v as string).toLocaleDateString() : '—',
    },
  ],
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GlobalUsersPage() {
  const { canManageUsers, canDeactivateUsers, canDeleteUsers } = usePermissions();

  // ── Filter state ────────────────────────────────────────────────────────────
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [search, setSearch]                   = useState('');
  const [roleFilter, setRoleFilter]           = useState('');
  const [statusFilter, setStatusFilter]       = useState('');
  const [page, setPage]                       = useState(0);
  const [pageSize, setPageSize]               = useState(PAGE_SIZE_DEFAULT);

  const hasActiveFilters = Boolean(search || roleFilter || statusFilter);

  const clearFilters = useCallback(() => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(0);
  }, []);

  // ── Data ────────────────────────────────────────────────────────────────────
  const { data: companiesData } = useCompanies({ limit: 200 });
  const companies = companiesData?.data ?? [];

  // Fetch all users for the selected company (client-side filtering applied below)
  const { data: usersData, isLoading, error } = useUsers(
    { companyId: selectedCompany?.id, limit: 200, page: 1 },
    { enabled: Boolean(selectedCompany) },
  );
  const allUsers = useMemo(() => usersData?.items ?? [], [usersData]);

  // ── Client-side filter + pagination ─────────────────────────────────────────
  const filteredUsers = useMemo(() => {
    let rows = allUsers;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (u) =>
          `${u.firstName ?? ''} ${u.lastName ?? ''}`.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q),
      );
    }
    if (roleFilter) rows = rows.filter((u) => u.role === roleFilter);
    if (statusFilter === 'active')   rows = rows.filter((u) => u.isActive !== false);
    if (statusFilter === 'inactive') rows = rows.filter((u) => u.isActive === false);
    return rows;
  }, [allUsers, search, roleFilter, statusFilter]);

  const paginatedUsers = useMemo(
    () => filteredUsers.slice(page * pageSize, (page + 1) * pageSize),
    [filteredUsers, page, pageSize],
  );

  // ── Drawer / dialog state ──────────────────────────────────────────────────
  const [drawerMode, setDrawerMode]       = useState<DrawerMode>('none');
  const [selectedUser, setSelectedUser]   = useState<User | null>(null);
  const [formError, setFormError]         = useState<string | undefined>();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateMutation        = useUpdateUserMutation();
  const deactivateMutation    = useDeactivateUserMutation();
  const reactivateMutation    = useReactivateUserMutation();
  const deleteMutation        = useDeleteUserMutation();
  const createCompanyMutation = useCreateCompanyWithOwnerMutation();

  // ── Drawer handlers ────────────────────────────────────────────────────────
  const openView = useCallback((user: User) => {
    setSelectedUser(user);
    setDrawerMode('view');
  }, []);

  const openEdit = useCallback((user: User) => {
    setFormError(undefined);
    setSelectedUser(user);
    setDrawerMode('edit');
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerMode('none');
    setSelectedUser(null);
    setFormError(undefined);
  }, []);

  // ── Mutation handlers ──────────────────────────────────────────────────────
  const handleEdit = useCallback(async (data: UpdateUserFormData) => {
    if (!selectedUser) return;
    try {
      setFormError(undefined);
      await updateMutation.mutateAsync({ id: selectedUser.id, ...data });
      closeDrawer();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    }
  }, [updateMutation, selectedUser, closeDrawer]);

  const handleCreateCompany = useCallback(async (data: CreateCompanyWithOwnerFormData) => {
    try {
      setFormError(undefined);
      const result = await createCompanyMutation.mutateAsync(data);
      closeDrawer();
      if (result.company) {
        setSelectedCompany(result.company as Company);
        setPage(0);
      }
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    }
  }, [createCompanyMutation, closeDrawer]);

  const execConfirm = useCallback(async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'deactivate') {
        await deactivateMutation.mutateAsync(confirmAction.user.id);
      } else if (confirmAction.type === 'reactivate') {
        await reactivateMutation.mutateAsync(confirmAction.user.id);
      } else if (confirmAction.type === 'delete') {
        await deleteMutation.mutateAsync(confirmAction.user.id);
        if (selectedUser?.id === confirmAction.user.id) closeDrawer();
      }
    } finally {
      setConfirmAction(null);
    }
  }, [confirmAction, deactivateMutation, reactivateMutation, deleteMutation, selectedUser, closeDrawer]);

  const confirmPending =
    deactivateMutation.isPending || reactivateMutation.isPending || deleteMutation.isPending;

  const confirmText = useMemo(() => {
    if (!confirmAction) return { title: '', description: '', label: '' };
    if (confirmAction.type === 'deactivate') return {
      title: 'Deactivate User',
      description: `${confirmAction.user.email} will immediately lose access. You can reactivate them later.`,
      label: 'Deactivate',
    };
    if (confirmAction.type === 'reactivate') return {
      title: 'Reactivate User',
      description: `${confirmAction.user.email} will regain access to the portal.`,
      label: 'Reactivate',
    };
    return {
      title: 'Delete User',
      description: `This will permanently delete ${confirmAction.user.email}. This action cannot be undone.`,
      label: 'Delete',
    };
  }, [confirmAction]);

  // ── Desktop columns ────────────────────────────────────────────────────────
  const columns = useMemo<GridColDef<User>[]>(() => [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
      renderCell: (p) => (
        <Typography variant="body2" fontWeight={500} noWrap>{p.value as string}</Typography>
      ),
    },
    {
      field: 'email',
      headerName: 'Email',
      flex: 1.5,
      minWidth: 190,
      renderCell: (p) => (
        <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize={12} noWrap>
          {p.row.email}
        </Typography>
      ),
    },
    {
      field: 'role',
      headerName: 'Role',
      width: 135,
      renderCell: (p) => (
        <Chip label={ROLE_LABELS[p.row.role] ?? p.row.role} size="small" variant="outlined" />
      ),
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 105,
      renderCell: (p) => <StatusBadge active={p.row.isActive} />,
    },
    {
      field: 'createdAt',
      headerName: 'Created',
      width: 110,
      renderCell: (p) => p.row.createdAt ? new Date(p.row.createdAt).toLocaleDateString() : '—',
    },
  ], []);

  // ── Row actions ────────────────────────────────────────────────────────────
  const rowActions = useCallback((user: User) => {
    const isActive = user.isActive !== false;
    return (
      <RowActions>
        <Tooltip title="View details">
          <IconButton size="small" onClick={() => openView(user)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        <PermissionGuard allowed={canManageUsers}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => openEdit(user)}>
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </PermissionGuard>

        <PermissionGuard allowed={canDeactivateUsers}>
          <Tooltip title={isActive ? 'Deactivate' : 'Reactivate'}>
            <IconButton
              size="small"
              color={isActive ? 'warning' : 'success'}
              onClick={() => setConfirmAction({ type: isActive ? 'deactivate' : 'reactivate', user })}
            >
              {isActive
                ? <BlockOutlinedIcon fontSize="small" />
                : <CheckCircleOutlinedIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </PermissionGuard>

        <PermissionGuard allowed={canDeleteUsers}>
          <Tooltip title="Delete permanently">
            <IconButton size="small" color="error" onClick={() => setConfirmAction({ type: 'delete', user })}>
              <DeleteOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </PermissionGuard>
      </RowActions>
    );
  }, [canManageUsers, canDeactivateUsers, canDeleteUsers, openView, openEdit]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box display="flex" flexDirection="column" flex={1} minHeight={0} sx={{ minWidth: 0, overflowX: 'hidden' }}>

      {/* ── Header ───────────────────────────────────────────────────────── */}
      <PageHeader
        title="Global Users"
        count={selectedCompany ? filteredUsers.length : undefined}
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => { setFormError(undefined); setDrawerMode('create-company'); }}
          >
            Create Company
          </Button>
        }
      />

      {/* ── Filter toolbar ────────────────────────────────────────────────── */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>

          {/* Company selector — primary context control */}
          <Autocomplete<Company>
            options={companies}
            value={selectedCompany}
            onChange={(_e, value) => {
              setSelectedCompany(value);
              clearFilters();
            }}
            getOptionLabel={(option) => option.displayName}
            isOptionEqualToValue={(option, value) => option.id === value.id}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Company"
                placeholder="Select a company…"
                size="small"
              />
            )}
            renderOption={(props, option) => (
              <li {...props} key={option.id}>
                <Box>
                  <Typography variant="body2" fontWeight={500}>{option.displayName}</Typography>
                  <Typography variant="caption" color="text.secondary">{option.companyKey}</Typography>
                </Box>
              </li>
            )}
            noOptionsText="No companies found"
            clearOnEscape
            sx={{ width: { xs: '100%', sm: 240 } }}
          />

          {/* Search */}
          <TextField
            size="small"
            placeholder="Search name or email…"
            value={search}
            disabled={!selectedCompany}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 200 } }}
          />

          {/* Role filter */}
          <FormControl size="small" disabled={!selectedCompany} sx={{ width: { xs: '100%', sm: 160 } }}>
            <InputLabel>Role</InputLabel>
            <Select value={roleFilter} label="Role" onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}>
              <MenuItem value=""><em>All roles</em></MenuItem>
              {GLOBAL_ROLE_FILTERS.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Status filter */}
          <FormControl size="small" disabled={!selectedCompany} sx={{ width: { xs: '100%', sm: 150 } }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
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
              onClick={clearFilters}
              sx={{ width: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {/* ── Empty state or user table ─────────────────────────────────────── */}
      {!selectedCompany ? (
        <Box py={8}>
          <EmptyState
            icon={BusinessOutlinedIcon}
            title="Select a company to view users."
            description="Use the company selector above to choose a company, or create a new one."
          />
        </Box>
      ) : (
        <DataTable<User>
          columns={columns}
          rows={paginatedUsers}
          total={filteredUsers.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(ps) => { setPageSize(ps); setPage(0); }}
          onRowClick={openView}
          rowActions={rowActions}
          loading={isLoading}
          error={error instanceof Error ? error : null}
          mobileCardConfig={mobileCardConfig}
          getRowId={(row) => row.id ?? ''}
          emptyState={
            <EmptyState
              icon={GroupOutlinedIcon}
              title={hasActiveFilters ? 'No results match your filters' : 'No users in this company'}
              description={
                hasActiveFilters
                  ? 'Try adjusting your search or clearing the filters.'
                  : 'This company has no users yet.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outlined" onClick={clearFilters}>Clear filters</Button>
                ) : undefined
              }
            />
          }
        />
      )}

      {/* ── Drawers & dialogs ─────────────────────────────────────────────── */}
      <CreateCompanyOwnerForm
        open={drawerMode === 'create-company'}
        onClose={closeDrawer}
        onSubmit={handleCreateCompany}
        loading={createCompanyMutation.isPending}
        error={formError}
      />

      <UserViewDrawer
        open={drawerMode === 'view'}
        user={selectedUser}
        onClose={closeDrawer}
        onEdit={() => selectedUser && openEdit(selectedUser)}
        onToggleActive={() => {
          if (!selectedUser) return;
          const isActive = selectedUser.isActive !== false;
          setConfirmAction({ type: isActive ? 'deactivate' : 'reactivate', user: selectedUser });
        }}
      />

      <UserEditForm
        open={drawerMode === 'edit'}
        user={selectedUser}
        onClose={closeDrawer}
        onSubmit={handleEdit}
        loading={updateMutation.isPending}
        error={formError}
      />

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmText.title}
        description={confirmText.description}
        confirmLabel={confirmText.label}
        danger={confirmAction?.type === 'delete'}
        onConfirm={execConfirm}
        onCancel={() => setConfirmAction(null)}
        loading={confirmPending}
      />
    </Box>
  );
}
