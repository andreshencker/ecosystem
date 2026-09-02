'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box       from '@mui/material/Box';
import Button    from '@mui/material/Button';
import Chip      from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import IconButton  from '@mui/material/IconButton';
import InputLabel  from '@mui/material/InputLabel';
import Select    from '@mui/material/Select';
import MenuItem  from '@mui/material/MenuItem';
import Skeleton  from '@mui/material/Skeleton';
import Tooltip   from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AddIcon                   from '@mui/icons-material/Add';
import CableOutlinedIcon         from '@mui/icons-material/CableOutlined';
import DeleteOutlineIcon         from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon          from '@mui/icons-material/EditOutlined';

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
  usePurposes,
  useDeletePurposeMutation,
} from '@/hooks/api/useRelayPurposes';
import { useIntegration } from '@/hooks/api/useRelayConnection';
import type { Purpose } from '@/types/communication-purposes';

import { PurposeFormDrawer } from './components/PurposeFormDrawer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

function credentialChip(label: string) {
  return (
    <Chip
      label={label}
      size="small"
      variant="outlined"
      color="info"
      sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
    />
  );
}

// ─── Row actions ──────────────────────────────────────────────────────────────

interface RowMenuProps {
  row:      Purpose;
  onEdit:   (p: Purpose) => void;
  onDelete: (p: Purpose) => void;
}

function PurposeRowActions({ row, onEdit, onDelete }: RowMenuProps) {
  return (
    <RowActions>
      <Tooltip title="Edit">
        <IconButton
          size="small"
          aria-label="Edit purpose"
          disabled={row.isSystem}
          onClick={() => onEdit(row)}
        >
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title={row.isSystem ? 'System purposes cannot be deleted' : 'Delete'}>
        <span>
          <IconButton
            size="small"
            aria-label="Delete purpose"
            color="error"
            disabled={row.isSystem}
            onClick={() => onDelete(row)}
          >
            <DeleteOutlineIcon fontSize="small" />
          </IconButton>
        </span>
      </Tooltip>
    </RowActions>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RelayPurposesPage() {
  const router = useRouter();

  // ── Connection pre-check ──────────────────────────────────────────────────
  // Reuse the existing integration hook (GET /settings/communications — route
  // path kept stable, see IntegrationConnection.provider comment in the backend).
  // Returns null on 404 (not configured); throws on real server errors.
  const { connection } = useIntegration('communications');
  const isConnected =
    connection.data !== null &&
    connection.data !== undefined &&
    connection.data.isActive === true;

  // ── List / filter state ───────────────────────────────────────────────────
  const [page,         setPage]         = useState(0);
  const [pageSize,     setPageSize]     = useState(25);
  const [search,       setSearch]       = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [drawerOpen,    setDrawerOpen]    = useState(false);
  const [editingPurpose, setEditingPurpose] = useState<Purpose | null>(null);

  // ── Confirm delete ────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<Purpose | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const active =
    activeFilter === 'active'   ? true  :
    activeFilter === 'inactive' ? false : undefined;

  const { data, isLoading, error } = usePurposes({
    page:   page + 1,
    limit:  pageSize,
    active,
    enabled: isConnected,
  });

  const deleteMutation = useDeletePurposeMutation();

  // Client-side search on the page's returned data
  const allRows: Purpose[] = data?.data ?? [];
  const rows = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        p.domainKey.toLowerCase().includes(q) ||
        p.domainCategory.toLowerCase().includes(q),
    );
  }, [allRows, search]);

  // ── Drawer helpers ────────────────────────────────────────────────────────
  function openCreate() { setEditingPurpose(null); setDrawerOpen(true); }
  function openEdit(p: Purpose) { setEditingPurpose(p); setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); setEditingPurpose(null); }

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    await deleteMutation.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  }, [confirmDelete, deleteMutation]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const hasActiveFilters = search !== '' || activeFilter !== 'all';
  function clearFilters() { setSearch(''); setActiveFilter('all'); setPage(0); }

  // ─── DataGrid columns ──────────────────────────────────────────────────────

  const columns: GridColDef[] = [
    {
      field: 'displayName',
      headerName: 'Purpose Name',
      flex: 1.5,
      minWidth: 160,
    },
    {
      field: 'domainKey',
      headerName: 'Purpose Key',
      flex: 1,
      minWidth: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {params.value as string}
        </Typography>
      ),
    },
    {
      field: 'domainCategory',
      headerName: 'Category',
      width: 130,
      renderCell: (params: GridRenderCellParams) => (
        <Chip label={params.value as string} size="small" variant="outlined" />
      ),
    },
    {
      field: 'channelsToUse',
      headerName: 'Email Credential',
      width: 160,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const channels = params.value as Purpose['channelsToUse'];
        const email = channels.find((c) => c.channel === 'email');
        return email
          ? credentialChip('Configured')
          : <Typography variant="body2" color="text.disabled">—</Typography>;
      },
    },
    {
      field: 'channelsToUse_sms',
      headerName: 'SMS Credential',
      width: 150,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const row = params.row as Purpose;
        const sms = row.channelsToUse.find((c) => c.channel === 'sms');
        return sms
          ? credentialChip('Configured')
          : <Typography variant="body2" color="text.disabled">—</Typography>;
      },
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
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => (
        <PurposeRowActions
          row={params.row as Purpose}
          onEdit={openEdit}
          onDelete={setConfirmDelete}
        />
      ),
    },
  ];

  // ── Mobile card config ────────────────────────────────────────────────────

  const mobileCardConfig: MobileCardConfig<Purpose> = {
    primaryText:   'displayName',
    secondaryText: 'domainKey',
    badge:         (row) => <StatusBadge active={row.isActive} />,
    fields: [
      { field: 'domainCategory', label: 'Category' },
      {
        field: 'channelsToUse',
        label: 'Email',
        render: (_val, row) => {
          const e = row.channelsToUse.find((c) => c.channel === 'email');
          return e ? <Chip label="Configured" size="small" color="info" variant="outlined" /> : '—';
        },
      },
      {
        field: 'channelsToUse',
        label: 'SMS',
        render: (_val, row) => {
          const s = row.channelsToUse.find((c) => c.channel === 'sms');
          return s ? <Chip label="Configured" size="small" color="info" variant="outlined" /> : '—';
        },
      },
      {
        field: 'updatedAt',
        label: 'Updated',
        render: (val) => (val ? fmtDate(val as string) : '—'),
      },
    ],
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  // While we check if Relay is connected, show a minimal skeleton
  // so the layout does not jump.
  if (connection.isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={280} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1, mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  // Relay integration is not configured (or is disabled).
  // Show a friendly guide instead of a raw HTTP error.
  if (!isConnected) {
    return (
      <Box>
        <PageHeader
          title="Relay Purposes"
          subtitle="Manage notification domains (purposes) in Relay."
        />
        <EmptyState
          icon={CableOutlinedIcon}
          title="Relay not connected"
          description={
            'This feature requires a Relay connection before you can create or manage Relay Purposes.\n' +
            'Connect your Business App to Relay first.'
          }
          action={
            <Button
              variant="contained"
              startIcon={<CableOutlinedIcon />}
              onClick={() => router.push('/settings/relay')}
            >
              Go to Relay Settings
            </Button>
          }
        />
      </Box>
    );
  }

  return (
    <Box>
      <PageHeader
        title="Relay Purposes"
        subtitle="Manage notification domains (purposes) in Relay."
        actions={
          <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
            New Purpose
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
        onPageSizeChange={setPageSize}
        loading={isLoading}
        error={error as Error | null}
        getRowId={(row) => row.id}
        mobileCardConfig={mobileCardConfig}
        emptyState={
          <EmptyState
            title="No Relay purposes found"
            action={
              <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                New Purpose
              </Button>
            }
          />
        }
        filterSlot={
          <SearchToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search by name, key or category…"
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={activeFilter}
                onChange={(e) => {
                  setActiveFilter(e.target.value as typeof activeFilter);
                  setPage(0);
                }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </SearchToolbar>
        }
      />

      {/* ── Form drawer ─────────────────────────────────────────────────── */}
      <PurposeFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        purpose={editingPurpose}
      />

      {/* ── Delete confirmation ──────────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Relay Purpose?"
        description={
          confirmDelete
            ? `"${confirmDelete.displayName}" will be permanently deleted. Events linked to this purpose will stop working.`
            : undefined
        }
        confirmLabel="Delete"
        danger
        onConfirm={handleDelete}
        onCancel={() => setConfirmDelete(null)}
        loading={deleteMutation.isPending}
      />
    </Box>
  );
}
