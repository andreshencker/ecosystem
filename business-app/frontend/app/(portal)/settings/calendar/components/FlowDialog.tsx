'use client';

import React, { useEffect, useState } from 'react';
import Button       from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog       from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle  from '@mui/material/DialogTitle';
import FormControl  from '@mui/material/FormControl';
import InputLabel   from '@mui/material/InputLabel';
import MenuItem     from '@mui/material/MenuItem';
import Alert        from '@mui/material/Alert';
import Select       from '@mui/material/Select';
import Typography   from '@mui/material/Typography';

import { useUpdateLinkedCalendarMutation } from '@/hooks/api/useLinkedCalendars';
import type { CalendarFlow, LinkedCalendar } from '@/types/linked-calendar';

interface FlowDialogProps {
  calendar: LinkedCalendar;
  open:     boolean;
  onClose:  () => void;
}

export function FlowDialog({ calendar, open, onClose }: FlowDialogProps) {
  const [flow, setFlow] = useState<CalendarFlow | ''>(calendar.flow ?? '');
  const updateMutation = useUpdateLinkedCalendarMutation();

  useEffect(() => {
    if (open) setFlow(calendar.flow ?? '');
  }, [open, calendar.flow]);

  async function handleSave() {
    if (!flow) return;
    await updateMutation.mutateAsync({ id: calendar.id, flow: flow as CalendarFlow });
    onClose();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        {calendar.flow ? 'Change Flow' : 'Assign Flow'}
      </DialogTitle>
      <DialogContent>
        {!calendar.flow && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This calendar has no flow assigned. Select how it will be used in Business App.
          </Alert>
        )}
        <Typography variant="body2" color="text.secondary" mb={2}>
          <strong>{calendar.calendarName}</strong>
          {' — '}{calendar.accountIdentifier}
        </Typography>
        <FormControl fullWidth size="small">
          <InputLabel>Use this calendar for</InputLabel>
          <Select
            label="Use this calendar for"
            value={flow}
            onChange={(e) => setFlow(e.target.value as CalendarFlow)}
          >
            <MenuItem value="holidays">Holidays</MenuItem>
            <MenuItem value="shifts">Shifts</MenuItem>
            <MenuItem value="payments">Payments</MenuItem>
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} disabled={updateMutation.isPending}>Cancel</Button>
        <Button
          variant="contained"
          onClick={handleSave}
          disabled={!flow || updateMutation.isPending}
          startIcon={
            updateMutation.isPending
              ? <CircularProgress size={14} color="inherit" />
              : undefined
          }
        >
          {updateMutation.isPending ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
