'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import Autocomplete from '@mui/material/Autocomplete';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import EventNoteOutlinedIcon from '@mui/icons-material/EventNoteOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import { type GridColDef } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import {
  ConfirmDialog,
  DataTable,
  EmptyState,
  RowActions,
  type MobileCardConfig,
} from '@/components/shared';
import {
  useCalendarConnections,
  useCalendars,
  useCalendarEvents,
  useAllCalendarsEvents,
  useCreateEventMutation,
  useUpdateEventMutation,
  useDeleteEventDirectMutation,
} from '@/hooks/api/useCalendar';
import { useUIStore }    from '@/stores/ui.store';
import { mapApiError }   from '@/lib/mapApiError';
import type { CalendarEvent, CreateEventDto, UpdateEventDto } from '@/types/calendar';

// ─── Constants ────────────────────────────────────────────────────────────────

const ALL_CALENDARS = '__all__';

// ─── Date helpers ─────────────────────────────────────────────────────────────

function fmtDateTime(iso: string, allDay: boolean): string {
  if (!iso) return '—';
  try {
    if (allDay) return new Date(iso).toLocaleDateString(undefined, { dateStyle: 'medium' });
    return new Date(iso).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function toLocal(iso: string): string {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch { return ''; }
}

function fromLocal(v: string): string {
  return v ? new Date(v).toISOString() : '';
}

// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, 'default' | 'success' | 'warning' | 'error'> = {
  confirmed: 'success',
  tentative: 'warning',
  cancelled: 'error',
};

function StatusChip({ status }: { status?: string }) {
  const s = status ?? 'confirmed';
  return (
    <Chip
      label={s.charAt(0).toUpperCase() + s.slice(1)}
      size="small"
      color={STATUS_COLORS[s] ?? 'default'}
      variant="outlined"
    />
  );
}

// ─── Event View Dialog ────────────────────────────────────────────────────────

function EventViewDialog({
  event,
  onClose,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
}) {
  if (!event) return null;

  const row = (label: string, value: React.ReactNode) => (
    <Stack direction="row" spacing={2} key={label}>
      <Typography variant="caption" color="text.secondary" sx={{ minWidth: 100, pt: 0.25 }}>
        {label}
      </Typography>
      <Typography variant="body2">{value || '—'}</Typography>
    </Stack>
  );

  const attendeeList = (event.attendees ?? [])
    .map((a) => (a.name ? `${a.name} <${a.email}>` : a.email))
    .join(', ');

  return (
    <Dialog open={Boolean(event)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <InfoOutlinedIcon fontSize="small" color="action" />
          <span>{event.title}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={1.5} mt={0.5}>
          {row('Status',      <StatusChip status={event.status} />)}
          {row('Start',       fmtDateTime(event.startAt, event.allDay))}
          {row('End',         fmtDateTime(event.endAt,   event.allDay))}
          {row('All Day',     event.allDay ? 'Yes' : 'No')}
          {event.timeZone && row('Timezone', event.timeZone)}
          {event.description && (
            <>
              <Divider />
              {row('Description', event.description)}
            </>
          )}
          {event.location && row('Location', event.location)}
          {event.organizerEmail && row('Organizer', event.organizerEmail)}
          {attendeeList && row('Attendees', attendeeList)}
          {event.uid && row('UID', event.uid)}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button variant="outlined" onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Event Form Dialog ────────────────────────────────────────────────────────

interface EventFormProps {
  open:    boolean;
  credId:  string;
  calId:   string;
  initial: CalendarEvent | null;
  onClose: () => void;
}

function EventFormDialog({ open, credId, calId, initial, onClose }: EventFormProps) {
  const pushSnack   = useUIStore((s) => s.pushSnack);
  const createMut   = useCreateEventMutation(credId, calId);
  const updateMut   = useUpdateEventMutation(credId, calId);
  const isEdit      = Boolean(initial);
  const isPending   = createMut.isPending || updateMut.isPending;

  const now = () => {
    const d = new Date(); d.setMinutes(0, 0, 0); d.setHours(d.getHours() + 1);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:00`;
  };

  const [title,     setTitle]     = useState('');
  const [desc,      setDesc]      = useState('');
  const [location,  setLocation]  = useState('');
  const [startAt,   setStartAt]   = useState(now());
  const [endAt,     setEndAt]     = useState('');
  const [allDay,    setAllDay]    = useState(false);
  const [timeZone,  setTimeZone]  = useState('');
  const [attendees, setAttendees] = useState('');

  useEffect(() => {
    if (open) {
      setTitle(initial?.title ?? '');
      setDesc(initial?.description ?? '');
      setLocation(initial?.location ?? '');
      setStartAt(initial?.startAt ? toLocal(initial.startAt) : now());
      setEndAt(initial?.endAt ? toLocal(initial.endAt) : '');
      setAllDay(initial?.allDay ?? false);
      setTimeZone(initial?.timeZone ?? '');
      setAttendees(
        (initial?.attendees ?? [])
          .map((a) => (a.name ? `${a.name} <${a.email}>` : a.email))
          .join(', ')
      );
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const parseAttendees = (raw: string) =>
    raw.split(',').map((s) => s.trim()).filter(Boolean).map((s) => {
      const m = s.match(/^(.*?)\s*<([^>]+)>$/);
      return m ? { name: m[1].trim(), email: m[2].trim() } : { email: s };
    });

  const handleSubmit = async () => {
    if (!title.trim() || !startAt) return;
    const dto: CreateEventDto = {
      title:       title.trim(),
      description: desc.trim()      || undefined,
      location:    location.trim()  || undefined,
      startAt:     allDay ? startAt.split('T')[0] : fromLocal(startAt),
      endAt:       allDay ? (endAt.split('T')[0] || startAt.split('T')[0]) : fromLocal(endAt),
      allDay,
      timeZone:    timeZone.trim()  || undefined,
      attendees:   attendees.trim() ? parseAttendees(attendees) : undefined,
    };
    try {
      if (isEdit && initial) {
        await updateMut.mutateAsync({ evId: initial.id, ...dto } as { evId: string } & UpdateEventDto);
        pushSnack({ type: 'success', message: 'Event updated' });
      } else {
        await createMut.mutateAsync(dto);
        pushSnack({ type: 'success', message: 'Event created' });
      }
      onClose();
    } catch (e) {
      pushSnack({ type: 'error', message: mapApiError(e) });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Event' : 'Create Event'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <TextField label="Title" size="small" fullWidth required value={title} onChange={(e) => setTitle(e.target.value)} />
          <TextField label="Description" size="small" fullWidth multiline minRows={2} value={desc} onChange={(e) => setDesc(e.target.value)} />
          <TextField label="Location" size="small" fullWidth value={location} onChange={(e) => setLocation(e.target.value)} />
          <FormControlLabel
            control={<Switch checked={allDay} onChange={(e) => setAllDay(e.target.checked)} />}
            label="All day"
          />
          <Box display="flex" gap={2}>
            <TextField label="Start" size="small" type={allDay ? 'date' : 'datetime-local'} fullWidth required
              InputLabelProps={{ shrink: true }}
              value={allDay ? startAt.split('T')[0] : startAt}
              onChange={(e) => setStartAt(e.target.value)} />
            <TextField label="End" size="small" type={allDay ? 'date' : 'datetime-local'} fullWidth
              InputLabelProps={{ shrink: true }}
              value={allDay ? endAt.split('T')[0] : endAt}
              onChange={(e) => setEndAt(e.target.value)} />
          </Box>
          <TextField label="Timezone" size="small" fullWidth placeholder="America/New_York" value={timeZone} onChange={(e) => setTimeZone(e.target.value)} />
          <TextField label="Attendees" size="small" fullWidth
            placeholder="email@example.com, Name <email@example.com>"
            helperText="Comma-separated"
            value={attendees} onChange={(e) => setAttendees(e.target.value)} />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button variant="contained" onClick={handleSubmit} disabled={!title.trim() || !startAt || isPending}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}>
          {isEdit ? 'Save Changes' : 'Create Event'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Connection selector label ────────────────────────────────────────────────

function connLabel(c: { displayIdentifier?: string; tag: string; companyChannelProvider?: { provider?: { displayName?: string } } }): string {
  const account  = c.displayIdentifier || c.tag;
  const provider = c.companyChannelProvider?.provider?.displayName ?? '';
  return provider ? `${account} — ${provider}` : account;
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function EventsPage() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  // ── Selections ─────────────────────────────────────────────────────────────
  const [selectedCredId,  setSelectedCredId]  = useState('');
  const [selectedCalId,   setSelectedCalId]   = useState(ALL_CALENDARS);
  const [dateFrom,        setDateFrom]         = useState('');
  const [dateTo,          setDateTo]           = useState('');
  const [search,          setSearch]           = useState('');
  const [locationFilter,  setLocationFilter]   = useState<string | null>(null);

  // ── Data: connections ──────────────────────────────────────────────────────
  const { data: connData, isLoading: connLoading } = useCalendarConnections();
  const connections = (connData?.data ?? []).filter((c) => c.isActive !== false);

  // Auto-select single connection
  const activeCredId = selectedCredId || connections[0]?.id || '';

  // ── Data: calendars (depend on connection) ─────────────────────────────────
  const { data: calendars = [], isLoading: calsLoading } = useCalendars(activeCredId || null);

  // Reset calendar selection whenever the active connection changes
  useEffect(() => {
    setSelectedCalId(ALL_CALENDARS);
  }, [activeCredId]);

  // Auto-select the calendar when there is exactly one available.
  // This also enables the Create Event button without requiring manual selection.
  useEffect(() => {
    if (calendars.length === 1 && selectedCalId === ALL_CALENDARS) {
      setSelectedCalId(calendars[0].id);
    }
  }, [calendars]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCalId = selectedCalId || ALL_CALENDARS;

  // ── Data: events (depend on calendar) ─────────────────────────────────────
  // Single-calendar path — disabled when ALL_CALENDARS is selected
  const singleEventsQuery = useCalendarEvents(
    activeCredId || null,
    activeCalId !== ALL_CALENDARS ? activeCalId : null,
    { from: dateFrom || undefined, to: dateTo || undefined },
  );

  // All-calendars path — disabled when a specific calendar is selected
  const allEventsQuery = useAllCalendarsEvents(
    activeCalId === ALL_CALENDARS ? (activeCredId || null) : null,
    activeCalId === ALL_CALENDARS ? calendars.map((c) => c.id) : [],
    { from: dateFrom || undefined, to: dateTo || undefined },
  );

  const eventsLoading = activeCalId === ALL_CALENDARS
    ? allEventsQuery.isLoading
    : singleEventsQuery.isLoading;

  const rawEvents: CalendarEvent[] = activeCalId === ALL_CALENDARS
    ? allEventsQuery.events
    : (singleEventsQuery.data?.items ?? []);

  // ── Location options — unique non-empty values from loaded events ─────────
  const locationOptions = useMemo<string[]>(() => {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const ev of rawEvents) {
      const loc = ev.location?.trim();
      if (!loc) continue;
      const key = loc.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(loc);
    }
    return out.sort((a, b) => a.localeCompare(b));
  }, [rawEvents]);

  // Clear location filter when the selected value disappears from the new dataset
  useEffect(() => {
    if (
      locationFilter &&
      !locationOptions.some((l) => l.toLowerCase() === locationFilter.toLowerCase())
    ) {
      setLocationFilter(null);
    }
  }, [locationOptions]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Combined client-side filtering ────────────────────────────────────────
  const events = useMemo(() => {
    let rows = rawEvents;
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          (e.location ?? '').toLowerCase().includes(q) ||
          (e.organizerEmail ?? '').toLowerCase().includes(q),
      );
    }
    if (locationFilter) {
      const locKey = locationFilter.toLowerCase();
      rows = rows.filter((e) => (e.location ?? '').trim().toLowerCase() === locKey);
    }
    return rows;
  }, [rawEvents, search, locationFilter]);

  // ── Active filters (for Clear button) ────────────────────────────────────
  const hasActiveFilters = Boolean(search || dateFrom || dateTo || locationFilter);

  const clearFilters = () => {
    setSearch('');
    setDateFrom('');
    setDateTo('');
    setLocationFilter(null);
  };

  // ── Dialogs ────────────────────────────────────────────────────────────────
  const [viewTarget,   setViewTarget]   = useState<CalendarEvent | null>(null);
  const [editTarget,   setEditTarget]   = useState<CalendarEvent | null>(null);
  const [formOpen,     setFormOpen]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CalendarEvent | null>(null);

  // The calendar for create/edit — must be a specific calendar
  const formCalId = editTarget
    ? editTarget.calendarId
    : (activeCalId !== ALL_CALENDARS ? activeCalId : '');

  const canCreate = Boolean(activeCredId) && activeCalId !== ALL_CALENDARS;

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit   = (ev: CalendarEvent) => { setEditTarget(ev); setFormOpen(true); };

  // ── Delete ─────────────────────────────────────────────────────────────────
  const deleteMutation = useDeleteEventDirectMutation();

  const handleDelete = useCallback(async () => {
    if (!deleteTarget || !activeCredId) return;
    try {
      await deleteMutation.mutateAsync({
        credId: activeCredId,
        calId:  deleteTarget.calendarId,
        evId:   deleteTarget.id,
      });
      pushSnack({ type: 'success', message: 'Event deleted' });
      setDeleteTarget(null);
    } catch (e) {
      pushSnack({ type: 'error', message: mapApiError(e) });
      setDeleteTarget(null);
    }
  }, [deleteTarget, activeCredId, deleteMutation, pushSnack]);

  // ── Table columns ──────────────────────────────────────────────────────────
  const columns: GridColDef<CalendarEvent>[] = [
    {
      field: 'title',
      headerName: 'Title',
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }) => (
        <Typography variant="body2" fontWeight={500} noWrap>{row.title}</Typography>
      ),
    },
    {
      field: 'startAt',
      headerName: 'Start',
      width: 160,
      renderCell: ({ row }) => (
        <Typography variant="body2">{fmtDateTime(row.startAt, row.allDay)}</Typography>
      ),
    },
    {
      field: 'endAt',
      headerName: 'End',
      width: 160,
      renderCell: ({ row }) => (
        <Typography variant="body2">{fmtDateTime(row.endAt, row.allDay)}</Typography>
      ),
    },
    {
      field: 'allDay',
      headerName: 'All Day',
      width: 85,
      sortable: false,
      renderCell: ({ row }) => (
        <Chip
          label={row.allDay ? 'Yes' : 'No'}
          size="small"
          color={row.allDay ? 'info' : 'default'}
          variant="outlined"
        />
      ),
    },
    {
      field: 'status',
      headerName: 'Status',
      width: 110,
      sortable: false,
      renderCell: ({ row }) => <StatusChip status={row.status} />,
    },
    {
      field: 'organizerEmail',
      headerName: 'Organizer',
      width: 180,
      sortable: false,
      renderCell: ({ row }) =>
        row.organizerEmail
          ? <Typography variant="body2" noWrap>{row.organizerEmail}</Typography>
          : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'location',
      headerName: 'Location',
      width: 150,
      sortable: false,
      renderCell: ({ row }) =>
        row.location
          ? <Typography variant="body2" noWrap>{row.location}</Typography>
          : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'attendees',
      headerName: 'Attendees',
      width: 100,
      sortable: false,
      renderCell: ({ row }) => {
        const count = row.attendees?.length ?? 0;
        return count > 0
          ? <Chip label={count} size="small" variant="outlined" />
          : <Typography variant="caption" color="text.disabled">—</Typography>;
      },
    },
  ];

  // ── Row actions ────────────────────────────────────────────────────────────
  const rowActions = useCallback(
    (row: CalendarEvent) => (
      <RowActions>
        <Tooltip title="View details">
          <IconButton size="small" onClick={() => setViewTarget(row)}>
            <InfoOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Edit">
          <IconButton size="small" onClick={() => openEdit(row)}>
            <EditOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Delete">
          <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
            <DeleteOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </RowActions>
    ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  // ── Mobile card ────────────────────────────────────────────────────────────
  const mobileConfig: MobileCardConfig<CalendarEvent> = {
    primaryText:   'title',
    secondaryText: (r) => fmtDateTime(r.startAt, r.allDay),
    badge:         (r) => <StatusChip status={r.status} />,
    fields: [
      { field: 'location',       label: 'Location',  render: (v) => <Typography variant="body2">{(v as string) || '—'}</Typography> },
      { field: 'organizerEmail', label: 'Organizer', render: (v) => <Typography variant="body2">{(v as string) || '—'}</Typography> },
    ],
  };

  // ── Content: empty states vs table ─────────────────────────────────────────
  const showNoConnections  = !connLoading && connections.length === 0;
  const showNoCalendars    = !showNoConnections && !calsLoading && activeCredId && calendars.length === 0;

  // ── Active connection label (for subtitle) ────────────────────────────────
  const activeConn = connections.find((c) => c.id === activeCredId);
  const subtitle = activeCalId === ALL_CALENDARS
    ? 'All calendars'
    : (calendars.find((c) => c.id === activeCalId)?.name ?? 'Select a calendar');

  return (
    <Box>
      <PageHeader
        title="Events"
        subtitle={activeConn ? `${connLabel(activeConn)} — ${subtitle}` : 'Configure a calendar connection to view events.'}
        count={!showNoConnections && !showNoCalendars ? events.length : undefined}
        actions={
          <Tooltip title={!canCreate ? 'Select a specific calendar to create events' : ''}>
            <span>
              <Button
                variant="contained"
                startIcon={<AddOutlinedIcon />}
                onClick={openCreate}
                disabled={!canCreate}
              >
                Create Event
              </Button>
            </span>
          </Tooltip>
        }
      />

      {/* ── Filter toolbar ───────────────────────────────────────────────── */}
      {/* Desktop: one compact row. Mobile: wraps automatically. */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>

          {/* Connection ── medium width, grows on large screens */}
          <FormControl size="small" sx={{ minWidth: 210, flex: '1 1 210px' }} disabled={connLoading}>
            <InputLabel>Connection</InputLabel>
            <Select
              value={activeCredId}
              label="Connection"
              onChange={(e) => {
                setSelectedCredId(e.target.value);
                setSelectedCalId(ALL_CALENDARS);
              }}
            >
              {connections.map((c) => (
                <MenuItem key={c.id} value={c.id}>{connLabel(c)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Calendar ── medium width */}
          <FormControl size="small" sx={{ minWidth: 170, flex: '1 1 170px' }} disabled={!activeCredId || calsLoading}>
            <InputLabel>Calendar</InputLabel>
            <Select
              value={activeCalId}
              label="Calendar"
              onChange={(e) => setSelectedCalId(e.target.value)}
            >
              <MenuItem value={ALL_CALENDARS}><em>All Calendars</em></MenuItem>
              {calendars.map((c) => (
                <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* From ── compact, fixed */}
          <TextField
            size="small"
            type="date"
            label="From"
            InputLabelProps={{ shrink: true }}
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            sx={{ width: 140, flex: '0 0 140px' }}
          />

          {/* To ── compact, fixed */}
          <TextField
            size="small"
            type="date"
            label="To"
            InputLabelProps={{ shrink: true }}
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            sx={{ width: 140, flex: '0 0 140px' }}
          />

          {/* Location ── searchable autocomplete, medium width */}
          <Autocomplete<string>
            size="small"
            options={locationOptions}
            value={locationFilter}
            onChange={(_e, val) => setLocationFilter(val)}
            disabled={locationOptions.length === 0}
            sx={{ minWidth: 170, flex: '1 1 170px' }}
            renderInput={(params) => (
              <TextField
                {...params}
                label="Location"
                placeholder={locationOptions.length === 0 ? 'No locations' : 'Filter by location…'}
              />
            )}
            noOptionsText="No matching locations"
          />

          {/* Search ── takes remaining space */}
          <TextField
            size="small"
            placeholder="Search title, location, organizer…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ minWidth: 180, flex: '2 1 180px' }}
          />

          {/* Clear filters ── only visible when filters are active */}
          {hasActiveFilters && (
            <Button
              size="small"
              variant="text"
              color="inherit"
              startIcon={<ClearOutlinedIcon fontSize="small" />}
              onClick={clearFilters}
              sx={{ whiteSpace: 'nowrap', flex: '0 0 auto' }}
            >
              Clear
            </Button>
          )}

        </Box>
      </Paper>

      {/* ── Content ──────────────────────────────────────────────────────── */}
      {showNoConnections ? (
        <EmptyState
          icon={EventNoteOutlinedIcon}
          title="No calendar connections configured"
          description="Add Calendar credentials first (Enabled Providers → Credentials) to use this page."
        />
      ) : showNoCalendars ? (
        <EmptyState
          icon={EventNoteOutlinedIcon}
          title="No calendars found"
          description="The selected connection has no calendars available."
        />
      ) : (
        <DataTable<CalendarEvent>
          tableHeight="max(400px, calc(100vh - 320px))"
          columns={columns}
          rows={events}
          total={events.length}
          page={0}
          pageSize={50}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          loading={eventsLoading || connLoading}
          error={null}
          rowActions={rowActions}
          mobileCardConfig={mobileConfig}
          getRowId={(r) => r.id}
          emptyState={
            <EmptyState
              icon={EventNoteOutlinedIcon}
              title={hasActiveFilters ? 'No events match your filters' : 'No events found'}
              description={
                hasActiveFilters
                  ? 'Try adjusting your search, date range, or location filter.'
                  : activeCalId === ALL_CALENDARS
                  ? 'No events in any calendar for this connection.'
                  : 'No events in the selected calendar.'
              }
              action={
                canCreate && !hasActiveFilters ? (
                  <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
                    Create Event
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}

      {/* ── Dialogs ──────────────────────────────────────────────────────── */}
      <EventViewDialog event={viewTarget} onClose={() => setViewTarget(null)} />

      <EventFormDialog
        open={formOpen}
        credId={activeCredId}
        calId={formCalId}
        initial={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete event?"
        description={
          deleteTarget ? `"${deleteTarget.title}" will be permanently deleted from the calendar provider.` : ''
        }
        confirmLabel="Delete"
        danger
        loading={deleteMutation.isPending}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
