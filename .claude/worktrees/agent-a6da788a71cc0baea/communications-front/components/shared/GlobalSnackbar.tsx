'use client';

import React from 'react';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { useUIStore } from '@/stores/ui.store';

export function GlobalSnackbar() {
  const snackQueue = useUIStore((s) => s.snackQueue);
  const dismissSnack = useUIStore((s) => s.dismissSnack);

  const current = snackQueue[0] ?? null;

  const handleClose = (_event: React.SyntheticEvent | Event, reason?: string) => {
    if (reason === 'clickaway') return;
    if (current) {
      dismissSnack(current.id);
    }
  };

  return (
    <Snackbar
      open={Boolean(current)}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
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
