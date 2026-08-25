'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddOutlinedIcon from '@mui/icons-material/AddOutlined';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import DeleteOutlinedIcon from '@mui/icons-material/DeleteOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import StarOutlinedIcon from '@mui/icons-material/StarOutlined';
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
  useCreateCalendarMutation,
  useUpdateCalendarMutation,
  useDeleteCalendarMutation,
} from '@/hooks/api/useCalendar';
import { useUIStore } from '@/stores/ui.store';
import { mapApiError } from '@/lib/mapApiError';
import type { CalendarInfo, CreateCalendarDto, UpdateCalendarDto } from '@/types/calendar';

// ─── Calendar form dialog ─────────────────────────────────────────────────────

interface CalendarFormDialogProps {
  open: boolean;
  credId: string;
  initial?: CalendarInfo | null;
  onClose: () => void;
}

function CalendarFormDialog({ open, credId, initial, onClose }: CalendarFormDialogProps) {
  const pushSnack = useUIStore((s) => s.pushSnack);
  const createMutation = useCreateCalendarMutation(credId);
  const updateMutation = useUpdateCalendarMutation(credId);
  const isEdit = Boolean(initial);

  const [name, setName]           = useState(initial?.name ?? '');
  const [description, setDesc]    = useState(initial?.description ?? '');
  const [color, setColor]         = useState(initial?.color ?? '');
  const [timeZone, setTimeZone]   = useState(initial?.timeZone ?? '');

  React.useEffect(() => {
    if (open) {
      setName(initial?.name ?? '');
      setDesc(initial?.description ?? '');
      setColor(initial?.color ?? '');
      setTimeZone(initial?.timeZone ?? '');
    }
  }, [open, initial]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    const dto: CreateCalendarDto = {
      name: name.trim(),
      description: description.trim() || undefined,
      color: color.trim() || undefined,
      timeZone: timeZone.trim() || undefined,
    };
    try {
      if (isEdit && initial) {
        await updateMutation.mutateAsync({ calId: initial.id, ...dto } as { calId: string } & UpdateCalendarDto);
        pushSnack({ type: 'success', message: 'Calendar updated' });
      } else {
        await createMutation.mutateAsync(dto);
        pushSnack({ type: 'success', message: 'Calendar created' });
      }
      onClose();
    } catch (e) {
      pushSnack({ type: 'error', message: mapApiError(e) });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? 'Edit Calendar' : 'Create Calendar'}</DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} mt={1}>
          <TextField
            label="Name"
            size="small"
            fullWidth
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <TextField
            label="Description"
            size="small"
            fullWidth
            multiline
            minRows={2}
            value={description}
            onChange={(e) => setDesc(e.target.value)}
          />
          <TextField
            label="Color"
            size="small"
            fullWidth
            placeholder="#4285F4 or colorId"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            helperText="Optional — hex color or provider color ID"
          />
          <TextField
            label="Timezone"
            size="small"
            fullWidth
            placeholder="America/New_York"
            value={timeZone}
            onChange={(e) => setTimeZone(e.target.value)}
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2, gap: 1 }}>
        <Button variant="outlined" onClick={onClose} disabled={isPending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSubmit}
          disabled={!name.trim() || isPending}
          startIcon={isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {isEdit ? 'Save Changes' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CalendarsPage() {
  const pushSnack = useUIStore((s) => s.pushSnack);

  const { data: connectionsData, isLoading: connectionsLoading } = useCalendarConnections();
  // Only active calendar credentials (filtered by backend: channelKey=calendar, isActive=true)
  const connections = (connectionsData?.data ?? []).filter((c) => c.isActive !== false);

  const [selectedCredId, setSelectedCredId] = useState<string>('');
  // Auto-select the first (and possibly only) connection
  const activeCredId = selectedCredId || connections[0]?.id || '';

  const { data: calendars = [], isLoading, error } = useCalendars(activeCredId || null);
  const deleteMutation = useDeleteCalendarMutation(activeCredId);

  const [formOpen,     setFormOpen]     = useState(false);
  const [editTarget,   setEditTarget]   = useState<CalendarInfo | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<CalendarInfo | null>(null);

  const openCreate = () => { setEditTarget(null); setFormOpen(true); };
  const openEdit   = (c: CalendarInfo) => { setEditTarget(c); setFormOpen(true); };

  const handleDelete = useCallback(async () => {
    if (!deleteTarget) return;
    try {
      await deleteMutation.mutateAsync(deleteTarget.id);
      pushSnack({ type: 'success', message: 'Calendar deleted' });
      setDeleteTarget(null);
    } catch (e) {
      pushSnack({ type: 'error', message: mapApiError(e) });
      setDeleteTarget(null);
    }
  }, [deleteTarget, deleteMutation, pushSnack]);

  const columns: GridColDef<CalendarInfo>[] = [
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 180,
      renderCell: ({ row }) => (
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="body2" fontWeight={500}>{row.name}</Typography>
          {row.isPrimary && (
            <Tooltip title="Primary calendar">
              <StarOutlinedIcon fontSize="small" sx={{ color: 'warning.main' }} />
            </Tooltip>
          )}
        </Stack>
      ),
    },
    {
      field: 'description',
      headerName: 'Description',
      flex: 1,
      minWidth: 160,
      sortable: false,
      renderCell: ({ row }) =>
        row.description
          ? <Typography variant="body2" noWrap>{row.description}</Typography>
          : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'timeZone',
      headerName: 'Timezone',
      width: 170,
      sortable: false,
      renderCell: ({ row }) =>
        row.timeZone
          ? <Typography variant="body2">{row.timeZone}</Typography>
          : <Typography variant="caption" color="text.disabled">—</Typography>,
    },
    {
      field: 'isReadOnly',
      headerName: 'Access',
      width: 100,
      sortable: false,
      renderCell: ({ row }) => (
        <Chip
          label={row.isReadOnly ? 'Read-only' : 'Read-write'}
          size="small"
          color={row.isReadOnly ? 'default' : 'success'}
          variant="outlined"
        />
      ),
    },
  ];

  const mobileConfig: MobileCardConfig<CalendarInfo> = {
    primaryText: 'name',
    secondaryText: (r) => r.timeZone ?? r.description ?? '',
    badge: (r) =>
      r.isPrimary ? <Chip label="Primary" size="small" color="warning" variant="outlined" /> : null,
    fields: [],
  };

  const rowActions = useCallback(
    (row: CalendarInfo) => (
      <RowActions>
        <Tooltip title="Edit">
          <span>
            <IconButton
              size="small"
              onClick={() => openEdit(row)}
              disabled={row.isReadOnly}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
        <Tooltip title="Delete">
          <span>
            <IconButton
              size="small"
              color="error"
              onClick={() => setDeleteTarget(row)}
              disabled={row.isReadOnly || row.isPrimary}
            >
              <DeleteOutlinedIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </RowActions>
    ),
    [],
  );

  return (
    <Box>
      <PageHeader
        title="Calendars"
        subtitle="Browse and manage calendars from your connected providers."
        count={calendars.length}
        actions={
          <Stack direction="row" spacing={1} alignItems="center">
            {connections.length > 1 && (
              <FormControl size="small" sx={{ minWidth: 240 }}>
                <InputLabel>Calendar account</InputLabel>
                <Select
                  value={activeCredId}
                  label="Calendar account"
                  onChange={(e) => setSelectedCredId(e.target.value)}
                >
                  {connections.map((c) => {
                    const account  = c.displayIdentifier || c.tag;
                    const provider = c.companyChannelProvider?.provider?.displayName ?? '';
                    return (
                      <MenuItem key={c.id} value={c.id}>
                        {provider ? `${account} — ${provider}` : account}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            )}
            <Button
              variant="contained"
              startIcon={<AddOutlinedIcon />}
              onClick={openCreate}
              disabled={!activeCredId}
            >
              New Calendar
            </Button>
          </Stack>
        }
      />

      {!connectionsLoading && connections.length === 0 ? (
        <EmptyState
          icon={CalendarMonthOutlinedIcon}
          title="No calendar connections found"
          description="Add Calendar credentials first (Enabled Providers → Credentials) to use this page."
        />
      ) : (
        <DataTable<CalendarInfo>
          columns={columns}
          rows={calendars}
          total={calendars.length}
          page={0}
          pageSize={25}
          onPageChange={() => {}}
          onPageSizeChange={() => {}}
          loading={isLoading}
          error={error instanceof Error ? error : null}
          rowActions={rowActions}
          mobileCardConfig={mobileConfig}
          getRowId={(r) => r.id}
          emptyState={
            <EmptyState
              icon={CalendarMonthOutlinedIcon}
              title="No calendars found"
              description="No calendars found for this connection."
              action={
                <Button variant="contained" startIcon={<AddOutlinedIcon />} onClick={openCreate}>
                  New Calendar
                </Button>
              }
            />
          }
        />
      )}

      <CalendarFormDialog
        open={formOpen}
        credId={activeCredId}
        initial={editTarget}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete calendar?"
        description={
          deleteTarget
            ? `"${deleteTarget.name}" and all its events will be permanently deleted from the provider.`
            : ''
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
