'use client';

import React, { useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import Alert        from '@mui/material/Alert';
import Box          from '@mui/material/Box';
import Button       from '@mui/material/Button';
import Checkbox     from '@mui/material/Checkbox';
import CircularProgress from '@mui/material/CircularProgress';
import Divider      from '@mui/material/Divider';
import FormControl  from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import FormGroup    from '@mui/material/FormGroup';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel   from '@mui/material/InputLabel';
import MenuItem     from '@mui/material/MenuItem';
import Select       from '@mui/material/Select';
import Stack        from '@mui/material/Stack';
import Typography   from '@mui/material/Typography';

import EventNoteIcon from '@mui/icons-material/EventNote';

import { FormDrawer, LoadingButton } from '@/components/shared';
import {
  useAvailableCalendarAccounts,
  useAvailableCalendars,
  useLinkCalendarsMutation,
} from '@/hooks/api/useLinkedCalendars';
import type { CalendarFlow } from '@/types/linked-calendar';

// ─── Form shape ───────────────────────────────────────────────────────────────

interface FormValues {
  connectionId: string;
  calendarIds:  string[];
  flow:         CalendarFlow | '';
}

interface LinkCalendarsDrawerProps {
  open:    boolean;
  onClose: () => void;
}

// ─── Account selector step ────────────────────────────────────────────────────

function AccountStep({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  const { data: accounts, isLoading, error } = useAvailableCalendarAccounts();

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1.5}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading accounts…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {(error as any)?.response?.data?.message ?? 'Failed to load calendar accounts.'}
      </Alert>
    );
  }

  if (!accounts || accounts.length === 0) {
    return (
      <Alert severity="info" icon={<EventNoteIcon />}>
        No calendar accounts found. Connect a calendar account in{' '}
        <strong>Relay → Calendar → Connect</strong> first.
      </Alert>
    );
  }

  return (
    <FormControl fullWidth size="small" required>
      <InputLabel>Calendar account</InputLabel>
      <Select
        label="Calendar account"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      >
        <MenuItem value="">Select an account</MenuItem>
        {accounts.map((acc) => (
          <MenuItem key={acc.connectionId} value={acc.connectionId}>
            <Box>
              <Typography variant="body2">{acc.accountIdentifier}</Typography>
              <Typography variant="caption" color="text.secondary">{acc.providerDisplayName}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Select>
      <FormHelperText>Select the calendar account to link from.</FormHelperText>
    </FormControl>
  );
}

// ─── Calendar selector step ───────────────────────────────────────────────────

function CalendarStep({
  connectionId,
  selectedIds,
  onToggle,
}: {
  connectionId: string;
  selectedIds:  Set<string>;
  onToggle:     (id: string) => void;
}) {
  const { data: calendars, isLoading, error } = useAvailableCalendars(connectionId);

  if (isLoading) {
    return (
      <Box display="flex" alignItems="center" gap={1.5} py={2}>
        <CircularProgress size={16} />
        <Typography variant="body2" color="text.secondary">Loading calendars…</Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">
        {(error as any)?.response?.data?.message ?? 'Failed to load calendars.'}
      </Alert>
    );
  }

  // Only show calendars that are NOT already linked
  const available = (calendars ?? []).filter((c) => !c.isLinked);

  if (available.length === 0) {
    return (
      <Alert severity="info">
        All calendars from this account have already been linked.
      </Alert>
    );
  }

  return (
    <Box>
      <Typography variant="body2" color="text.secondary" mb={1.5}>
        Select one or more calendars to link. Already-linked calendars are hidden.
      </Typography>
      <FormGroup>
        {available.map((cal) => (
          <FormControlLabel
            key={cal.externalCalendarId}
            control={
              <Checkbox
                size="small"
                checked={selectedIds.has(cal.externalCalendarId)}
                onChange={() => onToggle(cal.externalCalendarId)}
              />
            }
            label={
              <Box>
                <Typography variant="body2">{cal.calendarName}</Typography>
                {cal.calendarDescription && (
                  <Typography variant="caption" color="text.secondary">
                    {cal.calendarDescription}
                  </Typography>
                )}
              </Box>
            }
            sx={{ mb: 0.5 }}
          />
        ))}
      </FormGroup>
    </Box>
  );
}

// ─── Drawer ───────────────────────────────────────────────────────────────────

export function LinkCalendarsDrawer({ open, onClose }: LinkCalendarsDrawerProps) {
  const [connectionId,  setConnectionId]  = useState('');
  const [selectedIds,   setSelectedIds]   = useState<Set<string>>(new Set());
  const [flow,          setFlow]          = useState<CalendarFlow | ''>('');
  const [flowError,     setFlowError]     = useState('');
  const [selectionError, setSelectionError] = useState('');

  const linkMutation = useLinkCalendarsMutation();

  function reset() {
    setConnectionId('');
    setSelectedIds(new Set());
    setFlow('');
    setFlowError('');
    setSelectionError('');
  }

  useEffect(() => {
    if (open) reset();
  }, [open]);

  // Reset calendar selection when account changes
  useEffect(() => {
    setSelectedIds(new Set());
    setSelectionError('');
  }, [connectionId]);

  function toggleCalendar(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectionError('');
  }

  async function handleSave() {
    let valid = true;

    if (selectedIds.size === 0) {
      setSelectionError('Select at least one calendar.');
      valid = false;
    }
    if (!flow) {
      setFlowError('Flow is required. Select how this calendar will be used.');
      valid = false;
    }
    if (!valid) return;

    await linkMutation.mutateAsync({
      connectionId,
      calendarIds: [...selectedIds],
      flow: flow as CalendarFlow,
    });
    onClose();
  }

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title="Link Calendars"
      width={520}
      actions={
        <>
          <Button variant="outlined" onClick={onClose} disabled={linkMutation.isPending}>
            Cancel
          </Button>
          <LoadingButton
            variant="contained"
            loading={linkMutation.isPending}
            onClick={handleSave}
            disabled={!connectionId}
          >
            Link Selected
          </LoadingButton>
        </>
      }
    >
      <Box display="flex" flexDirection="column" gap={3}>
        {/* Step 1 — Account */}
        <Box>
          <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
            1. Select Calendar Account
          </Typography>
          <AccountStep value={connectionId} onChange={setConnectionId} />
        </Box>

        {/* Step 2 & 3 — Calendars (shown once account is selected) */}
        {connectionId && (
          <>
            <Divider />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                2. Select Calendars
              </Typography>
              <CalendarStep
                connectionId={connectionId}
                selectedIds={selectedIds}
                onToggle={toggleCalendar}
              />
              {selectionError && (
                <FormHelperText error sx={{ mt: 1 }}>{selectionError}</FormHelperText>
              )}
            </Box>

            {/* Step 4 — Flow (shown once account is selected) */}
            <Divider />
            <Box>
              <Typography variant="subtitle2" fontWeight={600} mb={1.5}>
                3. Assign Flow
              </Typography>
              <Typography variant="body2" color="text.secondary" mb={1.5}>
                Select how the selected calendars will be used across Business App.
              </Typography>
              <FormControl fullWidth size="small" required error={!!flowError}>
                <InputLabel>Use this calendar for</InputLabel>
                <Select
                  label="Use this calendar for"
                  value={flow}
                  onChange={(e) => {
                    setFlow(e.target.value as CalendarFlow);
                    setFlowError('');
                  }}
                >
                  <MenuItem value="">Select a flow</MenuItem>
                  <MenuItem value="holidays">Holidays</MenuItem>
                  <MenuItem value="shifts">Shifts</MenuItem>
                  <MenuItem value="payments">Payments</MenuItem>
                </Select>
                {flowError && <FormHelperText>{flowError}</FormHelperText>}
              </FormControl>
            </Box>
          </>
        )}

        {/* Summary */}
        {selectedIds.size > 0 && flow && (
          <Alert severity="info">
            Linking <strong>{selectedIds.size}</strong> calendar{selectedIds.size !== 1 ? 's' : ''} as{' '}
            <strong>{flow}</strong>.
          </Alert>
        )}
      </Box>
    </FormDrawer>
  );
}
