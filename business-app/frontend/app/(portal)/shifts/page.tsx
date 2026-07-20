'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import AddIcon from '@mui/icons-material/Add';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import HistoryOutlinedIcon from '@mui/icons-material/HistoryOutlined';
import SyncOutlinedIcon from '@mui/icons-material/SyncOutlined';
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
  useShifts,
  useDeleteShiftMutation,
  useTriggerSyncMutation,
  useSyncCalendarMutation,
  useShiftAssignmentSummary,
  useShiftPendingList,
} from '@/hooks/api/useShifts';
import { useContracts } from '@/hooks/api/useContracts';
import { useCalendarOptions, useLinkedCalendars } from '@/hooks/api/useLinkedCalendars';
import { formatShiftDate, formatShiftTimeRange } from '@/lib/formatShift';
import type { Shift } from '@/types/shift';
import { STATUS_LABELS } from '@/types/shift';
import { ShiftDrawer, type DrawerMode } from './components/ShiftDrawer';
import { SyncHistoryDrawer } from './components/SyncHistoryDrawer';
import { PendingContractModal } from './components/PendingContractModal';

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'default' | 'success' | 'error'> = {
  draft:     'default',
  confirmed: 'success',
  cancelled: 'error',
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function CalendarCell({ shift }: { shift: Shift }) {
  if (!shift.calendarName) {
    return <Typography variant="body2" color="text.disabled">—</Typography>;
  }
  return (
    <Tooltip title={`${shift.calendarProvider ?? ''} · ${shift.calendarAccount ?? ''}`}>
      <Chip
        icon={<CalendarMonthOutlinedIcon />}
        label={shift.calendarName}
        size="small"
        variant="outlined"
        color="info"
        sx={{ maxWidth: 150 }}
      />
    </Tooltip>
  );
}

function ContractCell({ shift }: { shift: Shift }) {
  // Match the BI pending rule exactly — defined once in the BI repository:
  //   createdFromCalendar = true
  //   AND contractAssigned = false
  //   AND contractId IS NULL
  //   AND syncStatus != 'deleted'
  if (
    shift.createdFromCalendar &&
    !shift.contractAssigned &&
    !shift.contractId &&
    shift.syncStatus !== 'deleted'
  ) {
    return <Chip label="Contract required" size="small" color="warning" variant="filled" />;
  }
  return null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ShiftsPage() {
  // ── List / filter state ───────────────────────────────────────────────────
  const [page,             setPage]             = useState(0);
  const [search,           setSearch]           = useState('');
  const [status,           setStatus]           = useState('');
  const [source,           setSource]           = useState('');
  const [date,             setDate]             = useState('');
  const [linkedCalendarId, setLinkedCalendarId] = useState('');

  // ── Drawer state ──────────────────────────────────────────────────────────
  const [drawerOpen,        setDrawerOpen]        = useState(false);
  const [drawerMode,        setDrawerMode]        = useState<DrawerMode>('create');
  const [activeShift,       setActiveShift]       = useState<Shift | null>(null);
  const [historyDrawerOpen, setHistoryDrawerOpen] = useState(false);
  const [deleteTarget,      setDeleteTarget]      = useState<Shift | null>(null);

  // ── Pending contract assignment modal ─────────────────────────────────────
  // Opens automatically once per page load when BI reports pending items.
  // The operational Shift table loads independently — BI availability does not block it.
  const [pendingModalOpen,  setPendingModalOpen]  = useState(false);
  const hasAutoOpenedModal = useRef(false);

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data, isLoading } = useShifts({
    page:             page + 1,
    limit:            25,
    search:           search || undefined,
    status:           status || undefined,
    source:           (source as 'calendar' | 'manual') || undefined,
    date:             date || undefined,
    linkedCalendarId: linkedCalendarId || undefined,
  });

  const syncMutation       = useTriggerSyncMutation();
  const singleSyncMutation = useSyncCalendarMutation();
  const deleteMutation     = useDeleteShiftMutation();
  // Only flow=shifts calendars — never holidays or payments
  const { data: shiftCalendars }    = useCalendarOptions('shifts');
  const { data: linkedCalendars, isLoading: calendarsLoading } =
    useLinkedCalendars({ status: 'active', flow: 'shifts' });
  // Prefetch BI pending list and active Contracts from page load.
  // Both are ready by the time the modal opens, eliminating the loading delay.
  const {
    data:       pendingData,
    isLoading:  pendingLoading,
    isFetching: pendingFetching,
    refetch:    refetchPending,
  } = useShiftPendingList({ limit: 100 });
  const { data: contractsData, isLoading: contractsLoading } =
    useContracts({ limit: 200, status: 'active' });
  // assignmentSummary is used for the pending-contract modal auto-open only.
  const { data: assignmentSummary } = useShiftAssignmentSummary();

  const hasActiveFilters =
    search !== '' || status !== '' || source !== '' || date !== '' || linkedCalendarId !== '';

  function clearFilters() {
    setSearch('');
    setStatus('');
    setSource('');
    setDate('');
    setLinkedCalendarId('');
    setPage(0);
  }

  // ── Drawer helpers ────────────────────────────────────────────────────────
  const openCreate = useCallback(() => {
    setActiveShift(null);
    setDrawerMode('create');
    setDrawerOpen(true);
  }, []);

  const openView = useCallback((s: Shift) => {
    setActiveShift(s);
    setDrawerMode('view');
    setDrawerOpen(true);
  }, []);

  const openEdit = useCallback((s: Shift) => {
    setActiveShift(s);
    setDrawerMode('edit');
    setDrawerOpen(true);
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerOpen(false);
    setActiveShift(null);
  }, []);

  // ── Auto-open pending modal when BI confirms outstanding assignments ──────
  useEffect(() => {
    if (
      !hasAutoOpenedModal.current &&
      assignmentSummary?.etlSyncedAt != null &&
      assignmentSummary.importedPendingContract > 0
    ) {
      setPendingModalOpen(true);
      hasAutoOpenedModal.current = true;
    }
  }, [assignmentSummary]);

  // ── Delete helpers ────────────────────────────────────────────────────────
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    await deleteMutation.mutateAsync(deleteTarget.id);
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation]);

  // ─── Desktop columns ──────────────────────────────────────────────────────
  //
  // Actions column: 3 buttons × 36 px + 2 gaps × 12 px + 16 px cell padding
  // = 148 px minimum. Using 160 px for comfortable spacing.
  // Source column removed — Calendar column communicates origin more precisely.

  const columns: GridColDef<Shift>[] = [
    {
      field: 'date',
      headerName: 'Date',
      width: 115,
      minWidth: 100,
      renderCell: ({ row }: GridRenderCellParams<Shift>) => (
        <Typography variant="body2" fontWeight={500}>
          {formatShiftDate(row.date)}
        </Typography>
      ),
    },
    {
      field: 'startTime',
      headerName: 'Time',
      width: 170,
      minWidth: 155,
      renderCell: ({ row }: GridRenderCellParams<Shift>) => (
        <Typography variant="body2">
          {formatShiftTimeRange(row.startTime, row.endTime)}
        </Typography>
      ),
    },
    {
      field: 'title',
      headerName: 'Title',
      width: 160,
      minWidth: 130,
      renderCell: ({ row }: GridRenderCellParams<Shift>) => (
        <Tooltip title={row.title ?? ''} disableHoverListener={!row.title}>
          <Typography variant="body2" noWrap>
            {row.title ?? 'Untitled Shift'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'location',
      headerName: 'Location',
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }: GridRenderCellParams<Shift>) => (
        <Tooltip title={row.location ?? ''} disableHoverListener={!row.location}>
          <Typography
            variant="body2"
            noWrap
            color={row.location ? 'text.primary' : 'text.disabled'}
          >
            {row.location ?? 'No location'}
          </Typography>
        </Tooltip>
      ),
    },
    {
      field: 'calendarName',
      headerName: 'Calendar',
      width: 165,
      minWidth: 140,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<Shift>) => (
        <CalendarCell shift={row} />
      ),
    },
    {
      field: 'contractStatus',
      headerName: 'Contract',
      width: 165,
      minWidth: 140,
      sortable: false,
      renderCell: ({ row }: GridRenderCellParams<Shift>) => (
        <ContractCell shift={row} />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      minWidth: 110,
      renderCell: ({ row }: GridRenderCellParams<Shift>) => (
        <Chip
          label={STATUS_LABELS[row.status]}
          size="small"
          color={STATUS_COLORS[row.status] ?? 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: '_actions',
      headerName: '',
      width: 160,
      minWidth: 160,
      sortable: false,
      resizable: false,
      disableColumnMenu: true,
      renderCell: ({ row }: GridRenderCellParams<Shift>) => (
        <RowActions onClick={(e) => e.stopPropagation()}>
          <Tooltip title="View">
            <IconButton
              size="small"
              aria-label="View shift"
              onClick={(e) => { e.stopPropagation(); openView(row); }}
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit">
            <IconButton
              size="small"
              aria-label="Edit shift"
              onClick={(e) => { e.stopPropagation(); openEdit(row); }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              aria-label="Delete shift"
              color="error"
              onClick={(e) => { e.stopPropagation(); setDeleteTarget(row); }}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </RowActions>
      ),
    },
  ];

  // ─── Mobile card ───────────────────────────────────────────────────────────
  //
  // Structure:
  //   Header row : title | status chip [+ "Contract required" when no contract]
  //   Secondary  : calendar name (for calendar-backed shifts only)
  //   Body fields: Date, Time, Location
  //   Footer     : View | Edit | Delete  (all unconditional)

  const mobileCardConfig: MobileCardConfig<Shift> = {
    primaryText: (r) => r.title ?? 'Untitled Shift',

    secondaryText: (r) => r.calendarName ?? '',

    badge: (r) => (
      <Stack direction="column" spacing={0.5} alignItems="flex-end" sx={{ flexShrink: 0, ml: 1 }}>
        <Chip
          label={STATUS_LABELS[r.status]}
          size="small"
          color={STATUS_COLORS[r.status] ?? 'default'}
          variant="outlined"
        />
        {!r.contractId && (
          <Chip label="Contract required" size="small" color="warning" variant="filled" />
        )}
      </Stack>
    ),

    fields: [
      {
        field: 'date',
        label: 'Date',
        render: (_, row) => formatShiftDate((row as Shift).date),
      },
      {
        field: 'startTime',
        label: 'Time',
        render: (_, row) =>
          formatShiftTimeRange((row as Shift).startTime, (row as Shift).endTime),
      },
      {
        field: 'location',
        label: 'Location',
        render: (val) => (val as string | null) ?? 'No location',
      },
    ],

    actions: (r) => (
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
          onClick={(e) => { e.stopPropagation(); openEdit(r); }}
        >
          Edit
        </Button>
        <Button
          size="small"
          color="error"
          startIcon={<DeleteOutlineIcon fontSize="small" />}
          onClick={(e) => { e.stopPropagation(); setDeleteTarget(r); }}
        >
          Delete
        </Button>
      </>
    ),
  };

  // ─── Table height ─────────────────────────────────────────────────────────
  // Summary area is now compact (~110 px). max() keeps the grid usable on
  // smaller desktops. Fixed offset accounts for: AppBar + header + summary + filters.
  const tableHeight = 'max(380px, calc(100vh - 380px))';

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    // pb on mobile ensures the floating support button cannot cover card footers
    <Box pb={{ xs: 8, sm: 0 }}>
      <PageHeader
        title="Shifts"
        count={data?.total}
        subtitle="Manage shifts for your contracts."
        actions={
          <Stack direction="row" spacing={1}>
            <Button
              variant="text"
              startIcon={<HistoryOutlinedIcon />}
              onClick={() => setHistoryDrawerOpen(true)}
            >
              Sync History
            </Button>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={openCreate}
            >
              New Shift
            </Button>
          </Stack>
        }
      />

      {/* ── Linked Shift Calendars ─────────────────────────────────────────── */}
      <Box mb={2}>
        {/* Header row: label + active count + global Sync All button */}
        <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
          <Stack direction="row" alignItems="center" spacing={0.75}>
            <Typography variant="caption" color="text.secondary" fontWeight={700} letterSpacing="0.06em">
              LINKED SHIFT CALENDARS
            </Typography>
            {!calendarsLoading && linkedCalendars && linkedCalendars.length > 0 && (
              <Typography variant="caption" color="text.disabled">
                · {linkedCalendars.length} active
              </Typography>
            )}
          </Stack>
          <Button
            size="small"
            variant="outlined"
            startIcon={
              syncMutation.isPending
                ? <CircularProgress size={14} color="inherit" />
                : <SyncOutlinedIcon />
            }
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending || singleSyncMutation.isPending}
            aria-label="Sync all linked shift calendars"
          >
            {syncMutation.isPending ? 'Syncing…' : 'Sync All'}
          </Button>
        </Stack>

        {/* Horizontally scrollable calendar card row */}
        {calendarsLoading ? (
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              overflowY: 'hidden',
              gap: 1.5,
              pb: 0.5,
            }}
          >
            {[1, 2, 3].map((i) => (
              <Skeleton
                key={i}
                variant="rounded"
                sx={{ minWidth: 200, flexShrink: 0 }}
                height={68}
              />
            ))}
          </Box>
        ) : !linkedCalendars || linkedCalendars.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No Shift calendars linked. Go to{' '}
            <Box component="span" fontWeight={500}>Settings → Calendar</Box>
            {' '}to link calendars.
          </Typography>
        ) : (
          <Box
            data-testid="calendar-cards-row"
            sx={{
              display: 'flex',
              flexWrap: 'nowrap',
              overflowX: 'auto',
              overflowY: 'hidden',
              gap: 1.5,
              pb: 0.5,
            }}
          >
            {linkedCalendars.map((cal) => {
              const isSyncing =
                singleSyncMutation.isPending && singleSyncMutation.variables === cal.id;
              const anyRunning = syncMutation.isPending || singleSyncMutation.isPending;

              return (
                <Tooltip
                  key={cal.id}
                  title={`${cal.providerDisplayName} · ${cal.accountIdentifier}`}
                  placement="top"
                >
                  <Box
                    data-testid={`calendar-card-${cal.id}`}
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      px: 1.5,
                      py: 1,
                      border: '1px solid',
                      borderColor: isSyncing ? 'info.main' : 'divider',
                      borderRadius: 1.5,
                      minWidth: 200,
                      flexShrink: 0,
                      bgcolor: 'background.paper',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <CalendarMonthOutlinedIcon
                      sx={{ fontSize: 16, color: 'info.main', flexShrink: 0 }}
                    />
                    <Box flex={1} minWidth={0}>
                      <Typography
                        variant="caption"
                        fontWeight={600}
                        noWrap
                        display="block"
                        lineHeight={1.3}
                        title={cal.calendarName}
                      >
                        {cal.calendarName}
                      </Typography>
                      <Chip
                        label="Active"
                        size="small"
                        color="success"
                        variant="outlined"
                        sx={{
                          mt: 0.25,
                          height: 18,
                          '& .MuiChip-label': { px: 0.75, fontSize: '0.6rem' },
                        }}
                      />
                    </Box>
                    <Tooltip title={`Sync ${cal.calendarName}`}>
                      {/* span wrapper needed so Tooltip works on a disabled button */}
                      <span>
                        <IconButton
                          size="small"
                          aria-label={`Sync ${cal.calendarName}`}
                          data-testid={`sync-btn-${cal.id}`}
                          disabled={anyRunning}
                          onClick={(e) => {
                            e.stopPropagation();
                            singleSyncMutation.mutate(cal.id);
                          }}
                        >
                          {isSyncing ? (
                            <CircularProgress size={16} color="inherit" />
                          ) : (
                            <SyncOutlinedIcon fontSize="small" />
                          )}
                        </IconButton>
                      </span>
                    </Tooltip>
                  </Box>
                </Tooltip>
              );
            })}
          </Box>
        )}
      </Box>
      <Divider sx={{ mb: 2 }} />

      <DataTable<Shift>
        rows={data?.items ?? []}
        columns={columns}
        loading={isLoading}
        total={data?.total ?? 0}
        page={page}
        pageSize={25}
        onPageChange={setPage}
        onPageSizeChange={() => { setPage(0); }}
        onRowClick={(row) => openView(row)}
        getRowId={(row) => row.id!}
        mobileCardConfig={mobileCardConfig}
        height={tableHeight}
        filterSlot={
          <SearchToolbar
            search={search}
            onSearchChange={(v) => { setSearch(v); setPage(0); }}
            placeholder="Search by title, location or notes…"
            hasActiveFilters={hasActiveFilters}
            onClearFilters={clearFilters}
          >
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={status}
                label="Status"
                onChange={(e) => { setStatus(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="draft">Draft</MenuItem>
                <MenuItem value="confirmed">Confirmed</MenuItem>
                <MenuItem value="cancelled">Cancelled</MenuItem>
              </Select>
            </FormControl>

            <FormControl size="small" sx={{ minWidth: 130 }}>
              <InputLabel>Source</InputLabel>
              <Select
                value={source}
                label="Source"
                onChange={(e) => { setSource(e.target.value); setPage(0); }}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="calendar">From Calendar</MenuItem>
                <MenuItem value="manual">Manual</MenuItem>
              </Select>
            </FormControl>

            {shiftCalendars && shiftCalendars.length > 0 && (
              <FormControl size="small" sx={{ minWidth: 160 }}>
                <InputLabel>Calendar</InputLabel>
                <Select
                  value={linkedCalendarId}
                  label="Calendar"
                  onChange={(e) => { setLinkedCalendarId(e.target.value); setPage(0); }}
                >
                  <MenuItem value="">All Calendars</MenuItem>
                  {shiftCalendars.map((cal) => (
                    <MenuItem key={cal.id} value={cal.id}>{cal.calendarName}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            )}

            <TextField
              type="date"
              size="small"
              label="Date"
              value={date}
              onChange={(e) => { setDate(e.target.value); setPage(0); }}
              InputLabelProps={{ shrink: true }}
              sx={{ minWidth: 150 }}
            />
          </SearchToolbar>
        }
        emptyState={
          <EmptyState
            title="No shifts found"
            description={
              hasActiveFilters
                ? 'Try adjusting your filters.'
                : 'Synchronize your linked calendars or create your first manual shift.'
            }
            icon={AccessTimeOutlinedIcon}
            action={
              !hasActiveFilters ? (
                <Button variant="contained" startIcon={<AddIcon />} onClick={openCreate}>
                  New Shift
                </Button>
              ) : undefined
            }
          />
        }
      />

      <ShiftDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        mode={drawerMode}
        shift={activeShift}
      />

      <SyncHistoryDrawer
        open={historyDrawerOpen}
        onClose={() => setHistoryDrawerOpen(false)}
      />

      {/* Pending Contract assignment modal — auto-opens when BI reports pending items.
          Data is pre-fetched from page load, so the modal renders without a network delay. */}
      {pendingModalOpen && assignmentSummary && (
        <PendingContractModal
          open={pendingModalOpen}
          onClose={() => setPendingModalOpen(false)}
          summary={assignmentSummary}
          pendingData={pendingData ?? null}
          pendingLoading={pendingLoading}
          pendingFetching={pendingFetching}
          refetchPending={refetchPending}
          contracts={contractsData?.items ?? []}
          contractsLoading={contractsLoading}
        />
      )}

      {/* Delete confirmation — message depends on whether an external event exists */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete Shift"
        description={
          deleteTarget?.linkedCalendarId
            ? 'This will permanently remove the Shift from Business App and delete the corresponding event from the connected calendar.'
            : 'This will permanently remove the Shift from Business App.'
        }
        confirmLabel="Delete"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
        loading={deleteMutation.isPending}
        danger
      />
    </Box>
  );
}
