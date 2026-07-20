'use client';

import React, { useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Box          from '@mui/material/Box';
import Button       from '@mui/material/Button';
import Chip         from '@mui/material/Chip';
import FormControl  from '@mui/material/FormControl';
import IconButton   from '@mui/material/IconButton';
import InputLabel   from '@mui/material/InputLabel';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Menu         from '@mui/material/Menu';
import MenuItem     from '@mui/material/MenuItem';
import Select       from '@mui/material/Select';
import Tooltip      from '@mui/material/Tooltip';
import Typography   from '@mui/material/Typography';

import AddIcon                from '@mui/icons-material/Add';
import BlockOutlinedIcon      from '@mui/icons-material/BlockOutlined';
import BusinessOutlinedIcon   from '@mui/icons-material/BusinessOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import DeleteOutlineIcon      from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon       from '@mui/icons-material/EditOutlined';
import MoreVertIcon           from '@mui/icons-material/MoreVert';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import { type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  RowActions,
  SearchToolbar,
  StatusBadge,
  type MobileCardConfig,
} from '@/components/shared';
import {
  useCustomers,
  useDeactivateCustomerMutation,
  useActivateCustomerMutation,
  useDeleteCustomerMutation,
} from '@/hooks/api/useCustomers';
import type { Customer, CustomerType } from '@/types/customer';

import { CustomerFormDrawer } from './components/CustomerFormDrawer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Row action menu ──────────────────────────────────────────────────────────

interface RowMenuProps {
  row:          Customer;
  onEdit:       (c: Customer) => void;
  onDeactivate: (c: Customer) => void;
  onActivate:   (c: Customer) => void;
  onDelete:     (c: Customer) => void;
}

function RowMenu({ row, onEdit, onDeactivate, onActivate, onDelete }: RowMenuProps) {
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);

  function handleClose(action?: () => void) {
    setOpen(false);
    action?.();
  }

  return (
    <>
      <RowActions onClick={(e) => e.stopPropagation()}>
        <Tooltip title="View">
          <IconButton
            size="small"
            aria-label="View customer"
            component="a"
            href={`/customers/${row.id}`}
            onClick={(e: React.MouseEvent) => { e.preventDefault(); e.stopPropagation(); window.location.href = `/customers/${row.id}`; }}
          >
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" aria-label="Edit customer" onClick={() => onEdit(row)}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="More actions">
          <IconButton
            size="small"
            aria-label="More actions"
            ref={anchorRef}
            onClick={(e) => { e.stopPropagation(); setOpen(true); }}
          >
            <MoreVertIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </RowActions>

      <Menu
        anchorEl={anchorRef.current}
        open={open}
        onClose={() => handleClose()}
        onClick={(e) => e.stopPropagation()}
        transformOrigin={{ horizontal: 'right', vertical: 'top' }}
        anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
        slotProps={{ paper: { sx: { minWidth: 180 } } }}
      >
        {row.isActive ? (
          <MenuItem onClick={() => handleClose(() => onDeactivate(row))}>
            <ListItemIcon><BlockOutlinedIcon fontSize="small" color="warning" /></ListItemIcon>
            <ListItemText>Deactivate</ListItemText>
          </MenuItem>
        ) : (
          <MenuItem onClick={() => handleClose(() => onActivate(row))}>
            <ListItemIcon><CheckCircleOutlineIcon fontSize="small" color="success" /></ListItemIcon>
            <ListItemText>Activate</ListItemText>
          </MenuItem>
        )}
        <MenuItem onClick={() => handleClose(() => onDelete(row))} sx={{ color: 'error.main' }}>
          <ListItemIcon><DeleteOutlineIcon fontSize="small" color="error" /></ListItemIcon>
          <ListItemText>Delete</ListItemText>
        </MenuItem>
      </Menu>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CustomersPage() {
  const router = useRouter();

  // ── List / filter state ───────────────────────────────────────────────────
  const [page,         setPage]         = useState(0);
  const [pageSize,     setPageSize]     = useState(25);
  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [typeFilter,   setTypeFilter]   = useState<'all' | CustomerType>('all');

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // ── Confirm dialogs ───────────────────────────────────────────────────────
  const [confirmDeactivate, setConfirmDeactivate] = useState<Customer | null>(null);
  const [confirmActivate,   setConfirmActivate]   = useState<Customer | null>(null);
  const [confirmDelete,     setConfirmDelete]     = useState<Customer | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const active =
    activeFilter === 'active'   ? true  :
    activeFilter === 'inactive' ? false : undefined;

  const { data, isLoading, error } = useCustomers({
    page:   page + 1,
    limit:  pageSize,
    search: search || undefined,
    active,
  });

  const deactivateMutation = useDeactivateCustomerMutation();
  const activateMutation   = useActivateCustomerMutation();
  const deleteMutation     = useDeleteCustomerMutation();

  const rows: Customer[] = (data?.items ?? []).filter(
    (c) => typeFilter === 'all' || c.type === typeFilter,
  );

  // ── Drawer helpers ────────────────────────────────────────────────────────
  function openCreate() { setEditingCustomer(null); setDrawerOpen(true); }
  function openEdit(c: Customer) { setEditingCustomer(c); setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); setEditingCustomer(null); }

  // ── Action handlers ───────────────────────────────────────────────────────
  const handleDeactivate = useCallback(async () => {
    if (!confirmDeactivate) return;
    await deactivateMutation.mutateAsync(confirmDeactivate.id);
    setConfirmDeactivate(null);
  }, [confirmDeactivate, deactivateMutation]);

  const handleActivate = useCallback(async () => {
    if (!confirmActivate) return;
    await activateMutation.mutateAsync(confirmActivate.id);
    setConfirmActivate(null);
  }, [confirmActivate, activateMutation]);

  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    await deleteMutation.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  }, [confirmDelete, deleteMutation]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const hasActiveFilters = search !== '' || activeFilter !== 'all' || typeFilter !== 'all';

  function clearFilters() {
    setSearch(''); setActiveFilter('all'); setTypeFilter('all'); setPage(0);
  }

  // ─── DataGrid columns ──────────────────────────────────────────────────────

  const columns: GridColDef[] = [
    {
      field: 'displayName',
      headerName: 'Name',
      flex: 1.5,
      minWidth: 160,
    },
    {
      field: 'type',
      headerName: 'Type',
      width: 120,
      renderCell: (params: GridRenderCellParams) => (
        <Chip
          label={params.value === 'company' ? 'Company' : 'Individual'}
          size="small"
          variant="outlined"
          color={params.value === 'company' ? 'primary' : 'default'}
        />
      ),
    },
    {
      field: 'contact',
      headerName: 'Primary Contact',
      flex: 1.2,
      minWidth: 180,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const row = params.row as Customer;
        const name  = row.contact?.name;
        const email = row.contact?.email;
        if (!name && !email) return <Typography variant="body2" color="text.disabled">—</Typography>;
        return (
          <Box display="flex" flexDirection="column" justifyContent="center" sx={{ lineHeight: 1.3 }}>
            {name  && <Typography variant="body2" noWrap>{name}</Typography>}
            {email && <Typography variant="caption" color="text.secondary" noWrap>{email}</Typography>}
          </Box>
        );
      },
    },
    {
      field: 'abn',
      headerName: 'ABN',
      width: 130,
      renderCell: (params: GridRenderCellParams) =>
        params.value
          ? <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{params.value}</Typography>
          : <Typography variant="body2" color="text.disabled">—</Typography>,
    },
    {
      field: 'isActive',
      headerName: 'Status',
      width: 90,
      renderCell: (params: GridRenderCellParams) => (
        <StatusBadge active={params.value as boolean} />
      ),
    },
    {
      field: 'updatedAt',
      headerName: 'Updated',
      width: 110,
      renderCell: (params: GridRenderCellParams) =>
        params.value
          ? <Typography variant="body2" color="text.secondary">{fmtDate(params.value as string)}</Typography>
          : null,
    },
    {
      field: '_actions',
      headerName: '',
      // Fixed width wide enough for 3 icon buttons (36px each) + 12px gaps + padding
      width: 148,
      minWidth: 148,
      sortable: false,
      resizable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams) => {
        const row = params.row as Customer;
        return (
          <RowMenu
            row={row}
            onEdit={openEdit}
            onDeactivate={setConfirmDeactivate}
            onActivate={setConfirmActivate}
            onDelete={setConfirmDelete}
          />
        );
      },
    },
  ];

  // ─── Mobile card config ────────────────────────────────────────────────────

  const mobileCardConfig: MobileCardConfig<Customer> = {
    primaryText:   'displayName',
    secondaryText: (row) => [row.contact?.name, row.contact?.email].filter(Boolean).join(' · '),
    badge:         (row) => <StatusBadge active={row.isActive} />,
    fields: [
      {
        field: 'type',
        label: 'Type',
        render: (v) => (
          <Chip
            label={v === 'company' ? 'Company' : 'Individual'}
            size="small"
            variant="outlined"
          />
        ),
      },
      { field: 'abn', label: 'ABN' },
    ],
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Customers"
        count={data?.total}
        subtitle="Manage the customers associated with your business."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            Create Customer
          </Button>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        onRowClick={(row) => router.push(`/customers/${row.id}`)}
        loading={isLoading}
        error={error as Error | null}
        mobileCardConfig={mobileCardConfig}
        getRowId={(row) => row.id}
        height="calc(100vh - 260px)"
        filterSlot={
          <SearchToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search name, contact, ABN…"
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Type</InputLabel>
              <Select
                value={typeFilter}
                label="Type"
                onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setPage(0); }}
              >
                <MenuItem value="all">All Types</MenuItem>
                <MenuItem value="company">Company</MenuItem>
                <MenuItem value="individual">Individual</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={activeFilter}
                label="Status"
                onChange={(e) => { setActiveFilter(e.target.value as typeof activeFilter); setPage(0); }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </SearchToolbar>
        }
        emptyState={
          <EmptyState
            title="No customers yet"
            description="Create your first customer to start managing your business relationships."
            icon={BusinessOutlinedIcon}
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                Create Customer
              </Button>
            }
          />
        }
      />

      {/* ── Drawers ────────────────────────────────────────────────────────── */}
      <CustomerFormDrawer open={drawerOpen} onClose={closeDrawer} customer={editingCustomer} />

      {/* ── Confirm dialogs ────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDeactivate}
        title="Deactivate customer?"
        description={`"${confirmDeactivate?.displayName}" will be marked inactive and cannot log in or receive notifications.`}
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        onCancel={() => setConfirmDeactivate(null)}
        loading={deactivateMutation.isPending}
        danger
      />
      <ConfirmDialog
        open={!!confirmActivate}
        title="Activate customer?"
        description={`"${confirmActivate?.displayName}" will be marked active again.`}
        confirmLabel="Activate"
        onConfirm={handleActivate}
        onCancel={() => setConfirmActivate(null)}
        loading={activateMutation.isPending}
      />
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete customer?"
        description={`"${confirmDelete?.displayName}" will be permanently deleted. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleteMutation.isPending}
        danger
      />
    </Box>
  );
}
