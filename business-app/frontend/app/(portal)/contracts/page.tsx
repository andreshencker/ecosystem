'use client';

import React, { useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import ArticleOutlinedIcon from '@mui/icons-material/ArticleOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';

import { type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  RowActions,
  SearchToolbar,
  type MobileCardConfig,
} from '@/components/shared';
import {
  useContracts,
  useDeleteContractMutation,
} from '@/hooks/api/useContracts';
import type { Contract } from '@/types/contract';
import { STATUS_LABELS, BILLING_CYCLE_LABELS } from '@/types/contract';
import { ContractFormDrawer, type DrawerMode } from './components/ContractFormDrawer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'default' | 'primary' | 'success' | 'warning' | 'error'> = {
  draft:     'default',
  active:    'success',
  inactive:  'warning',
  finished:  'primary',
  cancelled: 'error',
};

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ContractsPage() {
  // ── List / filter state ───────────────────────────────────────────────────
  const [page,    setPage]   = useState(0);
  const [pageSize, setPageSize] = useState(25);
  const [search,  setSearch] = useState('');
  const [status,  setStatus] = useState('');

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [drawerOpen,      setDrawerOpen]      = useState(false);
  const [drawerMode,      setDrawerMode]      = useState<DrawerMode>('create');
  const [activeContract,  setActiveContract]  = useState<Contract | null>(null);

  // ── Confirm delete ────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<Contract | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading, error } = useContracts({
    page:   page + 1,
    limit:  pageSize,
    search: search || undefined,
    status: status || undefined,
  });

  const deleteMutation = useDeleteContractMutation();

  const items = data?.items ?? [];
  const total = data?.total ?? 0;

  // ── Drawer helpers ────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setActiveContract(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  }, []);

  const openView = useCallback((c: Contract) => {
    setActiveContract(c);
    setDrawerMode('view');
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((c: Contract) => {
    setActiveContract(c);
    setDrawerMode('edit');
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setActiveContract(null);
  }, []);

  // ── Delete ────────────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    await deleteMutation.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  }, [confirmDelete, deleteMutation]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const hasActiveFilters = search !== '' || status !== '';

  function clearFilters() {
    setSearch(''); setStatus(''); setPage(0);
  }

  // ─── DataGrid columns ──────────────────────────────────────────────────────

  const columns: GridColDef[] = [
    {
      field: 'customerName',
      headerName: 'Company',
      flex: 1.2,
      minWidth: 140,
      renderCell: ({ row }: GridRenderCellParams<Contract>) => (
        <Typography variant="body2" color="text.secondary" noWrap title={row.customerName ?? ''}>
          {row.customerName ?? '—'}
        </Typography>
      ),
    },
    {
      field: 'positionName',
      headerName: 'Position',
      flex: 1.4,
      minWidth: 160,
      renderCell: ({ row }: GridRenderCellParams<Contract>) => (
        <Typography variant="body2" fontWeight={500}>{row.positionName}</Typography>
      ),
    },
    {
      field: 'invoiceDescription',
      headerName: 'Description',
      flex: 1.8,
      minWidth: 180,
      renderCell: ({ row }: GridRenderCellParams<Contract>) => (
        <Typography variant="body2" color="text.secondary" noWrap title={row.invoiceDescription}>
          {row.invoiceDescription}
        </Typography>
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      renderCell: ({ row }: GridRenderCellParams<Contract>) => (
        <Chip
          label={STATUS_LABELS[row.status]}
          size="small"
          color={STATUS_COLORS[row.status] ?? 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'billingCycle',
      headerName: 'Billing',
      width: 120,
      renderCell: ({ row }: GridRenderCellParams<Contract>) => (
        <Typography variant="body2">{BILLING_CYCLE_LABELS[row.billingCycle]}</Typography>
      ),
    },
    {
      field: 'startDate',
      headerName: 'Start',
      width: 110,
      renderCell: ({ row }: GridRenderCellParams<Contract>) => (
        <Typography variant="body2" color="text.secondary">{fmtDate(row.startDate)}</Typography>
      ),
    },
    {
      field: 'endDate',
      headerName: 'End',
      width: 110,
      renderCell: ({ row }: GridRenderCellParams<Contract>) => (
        <Typography variant="body2" color="text.secondary">{fmtDate(row.endDate)}</Typography>
      ),
    },
    {
      field: 'updatedAt',
      headerName: 'Updated',
      width: 115,
      renderCell: ({ row }: GridRenderCellParams<Contract>) => (
        <Typography variant="body2" color="text.secondary">{fmtDate(row.updatedAt)}</Typography>
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: 130,
      minWidth: 130,
      sortable: false,
      resizable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: GridRenderCellParams<Contract>) => (
        <RowActions onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View">
            <IconButton
              size="small"
              aria-label="View contract"
              onClick={(e) => { e.stopPropagation(); openView(row); }}
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>

          {row.status !== 'finished' && row.status !== 'cancelled' && (
            <Tooltip title="Edit">
              <IconButton
                size="small"
                aria-label="Edit contract"
                onClick={(e) => { e.stopPropagation(); openEdit(row); }}
              >
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Delete">
            <IconButton
              size="small"
              color="error"
              aria-label="Delete contract"
              onClick={(e) => { e.stopPropagation(); setConfirmDelete(row); }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </RowActions>
      ),
    },
  ];

  // ─── Mobile card ───────────────────────────────────────────────────────────

  const mobileCardConfig: MobileCardConfig<Contract> = {
    primaryText: 'positionName',
    badge: (r: Contract) => (
      <Chip
        label={STATUS_LABELS[r.status]}
        size="small"
        color={STATUS_COLORS[r.status] ?? 'default'}
        variant="outlined"
      />
    ),
    fields: [
      {
        field: 'customerName',
        label: 'Company',
        render: (v) => (v as string) ?? '—',
      },
      {
        field: 'invoiceDescription',
        label: 'Description',
        render: (v) => (v as string) ?? '—',
      },
      {
        field: 'billingCycle',
        label: 'Billing',
        render: (v) => BILLING_CYCLE_LABELS[v as keyof typeof BILLING_CYCLE_LABELS] ?? String(v),
      },
      {
        field: 'startDate',
        label: 'Start',
        render: (v) => fmtDate(v as string),
      },
      {
        field: 'endDate',
        label: 'End',
        render: (v) => v ? fmtDate(v as string) : 'Open-ended',
      },
    ],
    actions: (r: Contract) => {
      const isTerminal = r.status === 'finished' || r.status === 'cancelled';
      return (
        <>
          <Button
            size="small"
            startIcon={<VisibilityOutlinedIcon fontSize="small" />}
            onClick={(e) => { e.stopPropagation(); openView(r); }}
          >
            View
          </Button>
          <Button
            size="small"
            startIcon={<EditOutlinedIcon fontSize="small" />}
            disabled={isTerminal}
            onClick={(e) => { e.stopPropagation(); openEdit(r); }}
          >
            Edit
          </Button>
          <Button
            size="small"
            color="error"
            startIcon={<DeleteOutlineIcon fontSize="small" />}
            onClick={(e) => { e.stopPropagation(); setConfirmDelete(r); }}
          >
            Delete
          </Button>
        </>
      );
    },
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Contracts"
        count={total > 0 ? total : undefined}
        subtitle="Manage contracts for your customers."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Contract
          </Button>
        }
      />

      <DataTable<Contract>
        columns={columns}
        rows={items}
        total={total}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setPageSize(s); setPage(0); }}
        onRowClick={(row) => openView(row)}
        loading={isLoading}
        error={error as Error | null}
        height="calc(100vh - 250px)"
        filterSlot={
          <SearchToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search by position or description..."
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="finished">Finished</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>
          </SearchToolbar>
        }
        emptyState={
          <EmptyState
            title="No contracts found"
            description={
              hasActiveFilters
                ? 'Try adjusting your filters.'
                : 'Create your first contract to get started.'
            }
            icon={ArticleOutlinedIcon}
            action={
              !hasActiveFilters ? (
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                  New Contract
                </Button>
              ) : undefined
            }
          />
        }
        mobileCardConfig={mobileCardConfig}
      />

      {/* ── Drawer ─────────────────────────────────────────────────────────── */}
      <ContractFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        contract={activeContract}
        mode={drawerMode}
      />

      {/* ── Confirm delete ──────────────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Contract"
        description={`Delete "${confirmDelete?.positionName}"? This will permanently remove the contract. Contracts linked to existing shifts cannot be deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleteMutation.isPending}
        danger
      />
    </Box>
  );
}
