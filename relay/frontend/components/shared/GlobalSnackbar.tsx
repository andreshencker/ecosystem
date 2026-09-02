'use client';

import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useUIStore, type SnackMessage, type SnackType } from '@/stores/ui.store';

// ─── Duration policy (Form-Behaviour.md §5.4) ────────────────────────────────
//
// Every notification must eventually auto-dismiss. No toast stays permanently.
//
// | Type    | Default duration | Notes                                       |
// |---------|-----------------|---------------------------------------------|
// | success | 3 000 ms        | Routine feedback; dismiss quickly           |
// | warning | 5 000 ms        | Needs a moment to read                      |
// | error   | 8 000 ms        | Default for server/network errors           |
// | info    | 4 000 ms        | Informational; medium duration              |
//
// Callers may pass `duration` on individual snacks to override the default.
// The global mutationCache handler passes 6 000 ms for 4xx validation errors
// (shorter than 5xx because the message is actionable, not alarming).

function getAutoHideDuration(snack: SnackMessage): number {
  if (snack.duration !== undefined) return snack.duration;
  const defaults: Record<SnackType, number> = {
    success: 3000,
    warning: 5000,
    error:   8000,
    info:    4000,
  };
  return defaults[snack.type];
}

export function GlobalSnackbar() {
  const snackQueue  = useUIStore((s) => s.snackQueue);
  const dismissSnack = useUIStore((s) => s.dismissSnack);
  const current = snackQueue[0] ?? null;

  const handleClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    if (current) dismissSnack(current.id);
  };

  return (
    <Snackbar
      key={current?.id}
      open={Boolean(current)}
      autoHideDuration={current ? getAutoHideDuration(current) : null}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      {current ? (
        <Alert
          severity={current.type}
          onClose={handleClose}
          variant="filled"
          sx={{ width: '100%' }}
        >
          {current.message}
        </Alert>
      ) : undefined}
    </Snackbar>
  );
}
