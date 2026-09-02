'use client';

import React, { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Box          from '@mui/material/Box';
import Button       from '@mui/material/Button';
import Chip         from '@mui/material/Chip';
import FormControl  from '@mui/material/FormControl';
import IconButton   from '@mui/material/IconButton';
import InputLabel   from '@mui/material/InputLabel';
import MenuItem     from '@mui/material/MenuItem';
import Select       from '@mui/material/Select';
import Skeleton     from '@mui/material/Skeleton';
import Tooltip      from '@mui/material/Tooltip';
import Typography   from '@mui/material/Typography';

import AddIcon                       from '@mui/icons-material/Add';
import CableOutlinedIcon             from '@mui/icons-material/CableOutlined';
import DeleteOutlineIcon             from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon              from '@mui/icons-material/EditOutlined';
import NotificationsNoneOutlinedIcon from '@mui/icons-material/NotificationsNoneOutlined';

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
  useRelayEvents,
  useDeleteRelayEventMutation,
} from '@/hooks/api/useRelayEvents';
import { usePurposes }    from '@/hooks/api/useRelayPurposes';
import { useIntegration } from '@/hooks/api/useRelayConnection';
import type { RelayEvent, RelayEventType, ChannelStatus } from '@/types/relay-events';
import { EVENT_TYPE_OPTIONS, getEmailStatus, getSmsStatus } from '@/types/relay-events';
import type { Purpose } from '@/types/communication-purposes';

import { EventFormDrawer } from './components/EventFormDrawer';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

const EVENT_TYPE_COLORS: Record<RelayEventType, 'primary' | 'warning' | 'success' | 'error'> = {
  notification: 'primary',
  alert:        'warning',
  request:      'success',
  security:     'error',
};

function ChannelStatusChip({ status }: { status: ChannelStatus }) {
  if (status === 'disabled')   return <Typography variant="caption" color="text.disabled">—</Typography>;
  if (status === 'configured') return <Chip label="Configured" size="small" color="success" variant="outlined" />;
  return <Chip label="Missing" size="small" color="warning" variant="outlined" />;
}

// ─── Row actions ──────────────────────────────────────────────────────────────

interface EventRowActionsProps {
  row:      RelayEvent;
  onEdit:   (e: RelayEvent) => void;
  onDelete: (e: RelayEvent) => void;
}

function EventRowActions({ row, onEdit, onDelete }: EventRowActionsProps) {
  return (
    <RowActions>
      <Tooltip title="Edit">
        <IconButton size="small" aria-label="Edit event" onClick={() => onEdit(row)}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>
      <Tooltip title="Delete">
        <IconButton size="small" color="error" aria-label="Delete event" onClick={() => onDelete(row)}>
          <DeleteOutlineIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </RowActions>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RelayEventsPage() {
  const router = useRouter();

  // ── Connection pre-check (same guard as Purposes page) ────────────────────
  const { connection } = useIntegration('communications');
  const isConnected =
    connection.data !== null &&
    connection.data !== undefined &&
    connection.data.isActive === true;

  // ── Relay Purposes (domain selector) ──────────────────────────────
  const { data: purposesData, isLoading: loadingPurposes } = usePurposes({
    limit:   200,
    enabled: isConnected,
  });
  const purposes: Purpose[] = purposesData?.data ?? [];

  // ── Selected purpose ──────────────────────────────────────────────────────
  const [selectedDomainId, setSelectedDomainId] = useState('');
  const effectiveDomainId = selectedDomainId || (purposes[0]?.id ?? '');

  // ── List / filter state ───────────────────────────────────────────────────
  const [page,          setPage]          = useState(0);
  const [pageSize,      setPageSize]      = useState(25);
  const [search,        setSearch]        = useState('');
  const [typeFilter,    setTypeFilter]    = useState<RelayEventType | 'all'>('all');
  const [channelFilter, setChannelFilter] = useState<'all' | 'email' | 'sms' | 'both' | 'none'>('all');
  const [activeFilter,  setActiveFilter]  = useState<'all' | 'active' | 'inactive'>('all');

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [drawerOpen,  setDrawerOpen]  = useState(false);
  const [editingEvent, setEditingEvent] = useState<RelayEvent | null>(null);

  // ── Confirm delete ────────────────────────────────────────────────────────
  const [confirmDelete, setConfirmDelete] = useState<RelayEvent | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const active =
    activeFilter === 'active'   ? true  :
    activeFilter === 'inactive' ? false : undefined;

  const { data, isLoading, error } = useRelayEvents({
    domainCatalogueId: effectiveDomainId,
    page:   page + 1,
    limit:  pageSize,
    active,
    enabled: isConnected && !!effectiveDomainId,
  });

  const deleteMutation = useDeleteRelayEventMutation();

  // Client-side search + channel filter on returned data
  const allRows: RelayEvent[] = data?.data ?? [];
  const rows = useMemo(() => {
    let result = allRows;

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter(
        (e) =>
          e.eventKey.toLowerCase().includes(q) ||
          e.displayName.toLowerCase().includes(q) ||
          e.description?.toLowerCase().includes(q),
      );
    }

    if (typeFilter !== 'all') {
      result = result.filter((e) => e.eventType === typeFilter);
    }

    if (channelFilter !== 'all') {
      result = result.filter((e) => {
        const emailStatus = getEmailStatus(e.channelContent?.email);
        const smsStatus   = getSmsStatus(e.channelContent?.sms);
        switch (channelFilter) {
          case 'email': return emailStatus === 'configured';
          case 'sms':   return smsStatus   === 'configured';
          case 'both':  return emailStatus === 'configured' && smsStatus === 'configured';
          case 'none':  return emailStatus !== 'configured' && smsStatus !== 'configured';
          default:      return true;
        }
      });
    }

    return result;
  }, [allRows, search, typeFilter, channelFilter]);

  // ── Drawer helpers ────────────────────────────────────────────────────────
  function openCreate() { setEditingEvent(null); setDrawerOpen(true); }
  function openEdit(e: RelayEvent) { setEditingEvent(e); setDrawerOpen(true); }
  function closeDrawer() { setDrawerOpen(false); setEditingEvent(null); }

  // ── Delete handler ────────────────────────────────────────────────────────
  const handleDelete = useCallback(async () => {
    if (!confirmDelete) return;
    await deleteMutation.mutateAsync(confirmDelete.id);
    setConfirmDelete(null);
  }, [confirmDelete, deleteMutation]);

  // ── Filters ───────────────────────────────────────────────────────────────
  const hasActiveFilters =
    search !== '' || typeFilter !== 'all' || channelFilter !== 'all' || activeFilter !== 'all';

  function clearFilters() {
    setSearch('');
    setTypeFilter('all');
    setChannelFilter('all');
    setActiveFilter('all');
    setPage(0);
  }

  // ─── DataGrid columns ──────────────────────────────────────────────────────

  const columns: GridColDef[] = [
    {
      field: 'eventKey',
      headerName: 'Event Key',
      flex: 1,
      minWidth: 140,
      renderCell: (params: GridRenderCellParams) => (
        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>
          {params.value as string}
        </Typography>
      ),
    },
    {
      field: 'displayName',
      headerName: 'Event Name',
      flex: 1.5,
      minWidth: 160,
      renderCell: (params: GridRenderCellParams) => {
        const row = params.row as RelayEvent;
        return (
          <Box display="flex" flexDirection="column" justifyContent="center" sx={{ lineHeight: 1.3 }}>
            <Typography variant="body2" noWrap>{row.displayName}</Typography>
            {row.description && (
              <Typography variant="caption" color="text.secondary" noWrap>
                {row.description.slice(0, 55)}{row.description.length > 55 ? '…' : ''}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field: 'eventType',
      headerName: 'Type',
      width: 115,
      renderCell: (params: GridRenderCellParams) => {
        const type = params.value as RelayEventType;
        const label = EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
        return (
          <Chip
            label={label}
            size="small"
            color={EVENT_TYPE_COLORS[type] ?? 'default'}
            variant="outlined"
          />
        );
      },
    },
    {
      field: 'email',
      headerName: 'Email',
      width: 115,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const row = params.row as RelayEvent;
        return <ChannelStatusChip status={getEmailStatus(row.channelContent?.email)} />;
      },
    },
    {
      field: 'sms',
      headerName: 'SMS',
      width: 100,
      sortable: false,
      renderCell: (params: GridRenderCellParams) => {
        const row = params.row as RelayEvent;
        return <ChannelStatusChip status={getSmsStatus(row.channelContent?.sms)} />;
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
        <EventRowActions
          row={params.row as RelayEvent}
          onEdit={openEdit}
          onDelete={setConfirmDelete}
        />
      ),
    },
  ];

  // ── Mobile card config ────────────────────────────────────────────────────

  const mobileCardConfig: MobileCardConfig<RelayEvent> = {
    primaryText:   'displayName',
    secondaryText: 'eventKey',
    badge:         (row) => <StatusBadge active={row.isActive} />,
    fields: [
      {
        field: 'eventType',
        label: 'Type',
        render: (val) => {
          const type = val as RelayEventType;
          const label = EVENT_TYPE_OPTIONS.find((o) => o.value === type)?.label ?? type;
          return <Chip label={label} size="small" color={EVENT_TYPE_COLORS[type] ?? 'default'} variant="outlined" />;
        },
      },
      {
        field: 'channelContent',
        label: 'Email',
        render: (_val, row) => <ChannelStatusChip status={getEmailStatus(row.channelContent?.email)} />,
      },
      {
        field: 'channelContent',
        label: 'SMS',
        render: (_val, row) => <ChannelStatusChip status={getSmsStatus(row.channelContent?.sms)} />,
      },
      {
        field: 'updatedAt',
        label: 'Updated',
        render: (val) => (val ? fmtDate(val as string) : '—'),
      },
    ],
  };

  // ─── Early returns for special states ─────────────────────────────────────

  // Loading connection check
  if (connection.isLoading) {
    return (
      <Box>
        <Skeleton variant="text" width={280} height={40} sx={{ mb: 1 }} />
        <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 1, mb: 2 }} />
        <Skeleton variant="rectangular" height={300} sx={{ borderRadius: 1 }} />
      </Box>
    );
  }

  // Not connected
  if (!isConnected) {
    return (
      <Box>
        <PageHeader title="Relay Events" />
        <EmptyState
          icon={CableOutlinedIcon}
          title="Relay not connected"
          description="Connect Business App to Relay before managing Relay Events."
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

  // No purposes exist
  if (!loadingPurposes && purposes.length === 0) {
    return (
      <Box>
        <PageHeader title="Relay Events" />
        <EmptyState
          icon={NotificationsNoneOutlinedIcon}
          title="No Relay Purposes found"
          description="Create a Relay Purpose before adding Events."
          action={
            <Button
              variant="contained"
              startIcon={<NotificationsNoneOutlinedIcon />}
              onClick={() => router.push('/settings/relay-purposes')}
            >
              Go to Relay Purposes
            </Button>
          }
        />
      </Box>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Relay Events"
        subtitle="Manage notification events within your Relay Purposes."
        actions={
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={openCreate}
            disabled={!effectiveDomainId}
          >
            New Event
          </Button>
        }
      />

      {/* ── Purpose selector ──────────────────────────────────────────── */}
      <Box mb={2}>
        <FormControl size="small" sx={{ minWidth: 280 }}>
          <InputLabel>Relay Purpose</InputLabel>
          <Select
            label="Relay Purpose"
            value={effectiveDomainId}
            onChange={(e) => {
              setSelectedDomainId(e.target.value);
              setPage(0);
            }}
          >
            {purposes.map((p) => (
              <MenuItem key={p.id} value={p.id}>
                {p.displayName}
                <Typography
                  variant="caption"
                  color="text.secondary"
                  component="span"
                  sx={{ ml: 1, fontFamily: 'monospace' }}
                >
                  {p.domainKey}
                </Typography>
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>

      <DataTable
        columns={columns}
        rows={rows}
        total={data?.total ?? 0}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        loading={isLoading || loadingPurposes}
        error={error as Error | null}
        getRowId={(row) => row.id}
        mobileCardConfig={mobileCardConfig}
        emptyState={
          <EmptyState
            title={
              hasActiveFilters
                ? 'No events match your filters'
                : `No events in "${purposes.find((p) => p.id === effectiveDomainId)?.displayName ?? 'this purpose'}"`
            }
            action={
              hasActiveFilters ? (
                <Button variant="outlined" onClick={clearFilters}>Clear filters</Button>
              ) : (
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                  New Event
                </Button>
              )
            }
          />
        }
        filterSlot={
          <SearchToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search by key, name or description…"
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            {/* Event Type */}
            <FormControl size="small" sx={{ minWidth: 140 }}>
              <InputLabel>Type</InputLabel>
              <Select
                label="Type"
                value={typeFilter}
                onChange={(e) => { setTypeFilter(e.target.value as typeof typeFilter); setPage(0); }}
              >
                <MenuItem value="all">All types</MenuItem>
                {EVENT_TYPE_OPTIONS.map((opt) => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>

            {/* Channel */}
            <FormControl size="small" sx={{ minWidth: 135 }}>
              <InputLabel>Channel</InputLabel>
              <Select
                label="Channel"
                value={channelFilter}
                onChange={(e) => { setChannelFilter(e.target.value as typeof channelFilter); setPage(0); }}
              >
                <MenuItem value="all">All channels</MenuItem>
                <MenuItem value="email">Email only</MenuItem>
                <MenuItem value="sms">SMS only</MenuItem>
                <MenuItem value="both">Email + SMS</MenuItem>
                <MenuItem value="none">None configured</MenuItem>
              </Select>
            </FormControl>

            {/* Status */}
            <FormControl size="small" sx={{ minWidth: 115 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={activeFilter}
                onChange={(e) => { setActiveFilter(e.target.value as typeof activeFilter); setPage(0); }}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </Select>
            </FormControl>
          </SearchToolbar>
        }
      />

      {/* ── Form drawer ──────────────────────────────────────────────── */}
      <EventFormDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        event={editingEvent}
        purposes={purposes}
        selectedDomainId={effectiveDomainId}
      />

      {/* ── Delete confirmation ──────────────────────────────────────── */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Relay Event?"
        description={
          confirmDelete
            ? `"${confirmDelete.displayName}" (${confirmDelete.eventKey}) will be permanently deleted. Any notification flows that reference this event will stop working.`
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
