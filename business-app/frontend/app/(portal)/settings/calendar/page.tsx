'use client';

import React, { useState, useCallback } from 'react';
import Box       from '@mui/material/Box';
import Button    from '@mui/material/Button';
import Chip      from '@mui/material/Chip';
import FormControl from '@mui/material/FormControl';
import IconButton  from '@mui/material/IconButton';
import InputLabel  from '@mui/material/InputLabel';
import MenuItem    from '@mui/material/MenuItem';
import Select    from '@mui/material/Select';
import Tooltip   from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import AddIcon                from '@mui/icons-material/Add';
import EditOutlinedIcon       from '@mui/icons-material/EditOutlined';
import EventNoteIcon          from '@mui/icons-material/EventNote';
import LinkOffIcon            from '@mui/icons-material/LinkOff';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon  from '@mui/icons-material/PlayCircleOutline';

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
  useLinkedCalendars,
  useActivateLinkedCalendarMutation,
  usePauseLinkedCalendarMutation,
  useUnlinkLinkedCalendarMutation,
  useUpdateLinkedCalendarMutation,
} from '@/hooks/api/useLinkedCalendars';
import type { CalendarFlow, LinkedCalendar, LinkedCalendarsQuery } from '@/types/linked-calendar';
import { CALENDAR_FLOW_LABELS } from '@/types/linked-calendar';

import { LinkCalendarsDrawer }   from './components/LinkCalendarsDrawer';
import { CreateCalendarDrawer }  from './components/CreateCalendarDrawer';
import { FlowDialog }            from './components/FlowDialog';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-AU', {
    day: '2-digit', month: 'short', year: 'numeric',
  });
}

// ─── Flow chip ────────────────────────────────────────────────────────────────

const FLOW_COLORS: Record<CalendarFlow, 'primary' | 'secondary' | 'info'> = {
  holidays: 'info',
  shifts:   'secondary',
  payments: 'primary',
};

function FlowChip({ flow }: { flow: CalendarFlow | null }) {
  if (!flow) {
    return <Typography variant="caption" color="text.disabled">Unassigned</Typography>;
  }
  return (
    <Chip
      label={CALENDAR_FLOW_LABELS[flow]}
      size="small"
      color={FLOW_COLORS[flow]}
      variant="outlined"
    />
  );
}

// ─── Row actions ──────────────────────────────────────────────────────────────

interface CalendarRowActionsProps {
  row:         LinkedCalendar;
  onEditFlow:  (cal: LinkedCalendar) => void;
  onActivate:  (id: string) => void;
  onPause:     (cal: LinkedCalendar) => void;
  onUnlink:    (cal: LinkedCalendar) => void;
  activating:  boolean;
}

function CalendarRowActions({
  row,
  onEditFlow,
  onActivate,
  onPause,
  onUnlink,
  activating,
}: CalendarRowActionsProps) {
  return (
    <RowActions>
      <Tooltip title={row.flow ? 'Change Flow' : 'Assign Flow'}>
        <IconButton size="small" onClick={() => onEditFlow(row)}>
          <EditOutlinedIcon fontSize="small" />
        </IconButton>
      </Tooltip>

      {row.status === 'paused' ? (
        <Tooltip title="Activate">
          <IconButton
            size="small"
            color="success"
            onClick={() => onActivate(row.id)}
            disabled={activating}
          >
            <PlayCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      ) : (
        <Tooltip title="Pause">
          <IconButton size="small" color="warning" onClick={() => onPause(row)}>
            <PauseCircleOutlineIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      )}

      <Tooltip title="Remove">
        <IconButton size="small" color="error" onClick={() => onUnlink(row)}>
          <LinkOffIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </RowActions>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarSettingsPage() {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [search,      setSearch]      = useState('');
  const [statusFilter, setStatusFilter] = useState<'' | 'active' | 'paused'>('');
  const [flowFilter,   setFlowFilter]   = useState<CalendarFlow | ''>('');
  const [page,        setPage]        = useState(0);
  const [pageSize,    setPageSize]    = useState(25);

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [linkOpen,   setLinkOpen]   = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [flowTarget, setFlowTarget] = useState<LinkedCalendar | null>(null);

  // ── Confirm dialogs ───────────────────────────────────────────────────────
  const [pauseTarget,  setPauseTarget]  = useState<LinkedCalendar | null>(null);
  const [unlinkTarget, setUnlinkTarget] = useState<LinkedCalendar | null>(null);

  // ── Data ──────────────────────────────────────────────────────────────────
  const query: LinkedCalendarsQuery = {
    ...(statusFilter ? { status: statusFilter }         : {}),
    ...(flowFilter   ? { flow:   flowFilter as CalendarFlow } : {}),
    ...(search.trim() ? { search: search.trim() }        : {}),
  };

  const { data: allRows, isLoading, error } = useLinkedCalendars(query);
  const rows: LinkedCalendar[] = allRows ?? [];

  // ── Mutations ─────────────────────────────────────────────────────────────
  const activate = useActivateLinkedCalendarMutation();
  const pause    = usePauseLinkedCalendarMutation();
  const unlink   = useUnlinkLinkedCalendarMutation();

  // ── Filter helpers ────────────────────────────────────────────────────────
  const hasActiveFilters = search !== '' || statusFilter !== '' || flowFilter !== '';
  function clearFilters() {
    setSearch('');
    setStatusFilter('');
    setFlowFilter('');
    setPage(0);
  }

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handlePauseConfirm = useCallback(async () => {
    if (!pauseTarget) return;
    await pause.mutateAsync(pauseTarget.id);
    setPauseTarget(null);
  }, [pauseTarget, pause]);

  const handleUnlinkConfirm = useCallback(async () => {
    if (!unlinkTarget) return;
    await unlink.mutateAsync(unlinkTarget.id);
    setUnlinkTarget(null);
  }, [unlinkTarget, unlink]);

  // ── DataGrid columns ──────────────────────────────────────────────────────

  const columns: GridColDef[] = [
    {
      field:      'accountIdentifier',
      headerName: 'Account',
      flex:       1,
      minWidth:   130,
      renderCell: (p: GridRenderCellParams) => (
        <Typography variant="caption">{p.value as string}</Typography>
      ),
    },
    {
      field:      'providerDisplayName',
      headerName: 'Provider',
      width:      130,
      renderCell: (p: GridRenderCellParams) => (
        <Typography variant="caption">{p.value as string}</Typography>
      ),
    },
    {
      field:      'calendarName',
      headerName: 'Calendar',
      flex:       1.5,
      minWidth:   150,
      renderCell: (p: GridRenderCellParams) => {
        const row = p.row as LinkedCalendar;
        return (
          <Box>
            <Typography variant="body2" fontWeight={600}>{p.value as string}</Typography>
            {row.calendarDescription && (
              <Typography variant="caption" color="text.secondary" display="block">
                {row.calendarDescription}
              </Typography>
            )}
          </Box>
        );
      },
    },
    {
      field:      'flow',
      headerName: 'Flow',
      width:      120,
      sortable:   false,
      renderCell: (p: GridRenderCellParams) => (
        <FlowChip flow={p.value as CalendarFlow | null} />
      ),
    },
    {
      field:      'accessRole',
      headerName: 'Access',
      width:      100,
      renderCell: (p: GridRenderCellParams) => (
        <Typography variant="caption">{(p.value as string | null) ?? '—'}</Typography>
      ),
    },
    {
      field:      'status',
      headerName: 'Status',
      width:      90,
      renderCell: (p: GridRenderCellParams) => (
        <StatusBadge active={(p.value as string) === 'active'} />
      ),
    },
    {
      field:      'updatedAt',
      headerName: 'Updated',
      width:      110,
      renderCell: (p: GridRenderCellParams) =>
        p.value
          ? <Typography variant="body2" color="text.secondary">{fmtDate(p.value as string)}</Typography>
          : null,
    },
    {
      field:      '_actions',
      headerName: '',
      width:      155,
      sortable:   false,
      renderCell: (p: GridRenderCellParams) => (
        <CalendarRowActions
          row={p.row as LinkedCalendar}
          onEditFlow={setFlowTarget}
          onActivate={(id) => activate.mutate(id)}
          onPause={setPauseTarget}
          onUnlink={setUnlinkTarget}
          activating={activate.isPending}
        />
      ),
    },
  ];

  // ── Mobile card config ────────────────────────────────────────────────────

  const mobileCardConfig: MobileCardConfig<LinkedCalendar> = {
    primaryText:   'calendarName',
    secondaryText: (row) => `${row.accountIdentifier} — ${row.providerDisplayName}`,
    badge:         (row) => <StatusBadge active={row.status === 'active'} />,
    fields: [
      {
        field:  'flow',
        label:  'Flow',
        render: (val) => <FlowChip flow={val as CalendarFlow | null} />,
      },
      {
        field:  'accessRole',
        label:  'Access',
        render: (val) => String(val ?? '—'),
      },
      {
        field:  'updatedAt',
        label:  'Updated',
        render: (val) => (val ? fmtDate(val as string) : '—'),
      },
    ],
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Box>
      <PageHeader
        title="Linked Calendars"
        subtitle="Manage linked calendars used across Business App."
        count={rows.length > 0 ? rows.length : undefined}
        actions={
          <>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setLinkOpen(true)}
            >
              Link Calendars
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setCreateOpen(true)}
            >
              Create Calendar
            </Button>
          </>
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        total={rows.length}
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
            icon={EventNoteIcon}
            title="No linked calendars"
            description={
              hasActiveFilters
                ? 'No calendars match your current filters.'
                : 'Link an existing calendar or create a new one to get started.'
            }
            action={
              !hasActiveFilters ? (
                <Box display="flex" gap={1} justifyContent="center">
                  <Button variant="outlined" startIcon={<AddIcon />} onClick={() => setLinkOpen(true)}>
                    Link Calendars
                  </Button>
                  <Button variant="contained" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
                    Create Calendar
                  </Button>
                </Box>
              ) : undefined
            }
          />
        }
        filterSlot={
          <SearchToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search by name, account or provider…"
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Status</InputLabel>
              <Select
                label="Status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value as typeof statusFilter);
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="paused">Paused</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Flow</InputLabel>
              <Select
                label="Flow"
                value={flowFilter}
                onChange={(e) => {
                  setFlowFilter(e.target.value as CalendarFlow | '');
                  setPage(0);
                }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="holidays">Holidays</MenuItem>
                <MenuItem value="shifts">Shifts</MenuItem>
                <MenuItem value="payments">Payments</MenuItem>
              </Select>
            </FormControl>
          </SearchToolbar>
        }
      />

      {/* Drawers */}
      <LinkCalendarsDrawer
        open={linkOpen}
        onClose={() => setLinkOpen(false)}
      />
      <CreateCalendarDrawer
        open={createOpen}
        onClose={() => setCreateOpen(false)}
      />
      {flowTarget && (
        <FlowDialog
          calendar={flowTarget}
          open
          onClose={() => setFlowTarget(null)}
        />
      )}

      {/* Confirm dialogs */}
      <ConfirmDialog
        open={!!pauseTarget}
        title="Pause Calendar"
        description={`Pause "${pauseTarget?.calendarName}"? Events from this calendar will not be processed until it is activated again.`}
        confirmLabel="Pause"
        loading={pause.isPending}
        onConfirm={handlePauseConfirm}
        onCancel={() => setPauseTarget(null)}
      />
      <ConfirmDialog
        open={!!unlinkTarget}
        title="Remove Linked Calendar"
        description="This calendar will no longer be used by Business App. The original calendar and all of its events will remain in your calendar provider."
        confirmLabel="Remove"
        danger
        loading={unlink.isPending}
        onConfirm={handleUnlinkConfirm}
        onCancel={() => setUnlinkTarget(null)}
      />
    </Box>
  );
}
