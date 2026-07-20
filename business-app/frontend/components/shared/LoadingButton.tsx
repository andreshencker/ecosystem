'use client';

import React from 'react';
import Button, { ButtonProps } from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';

export interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
}

/**
 * Drop-in LoadingButton following Form-Behaviour.md §8.1.
 * Wraps MUI Button with a spinner startIcon while loading and enforces
 * disabled state — prevents double submit without needing @mui/lab.
 */
export function LoadingButton({
  loading = false,
  disabled = false,
  children,
  startIcon,
  ...props
}: LoadingButtonProps) {
  return (
    <Button
      {...props}
      disabled={disabled || loading}
      startIcon={loading ? <CircularProgress size={16} color="inherit" /> : startIcon}
    >
      {children}
    </Button>
  );
}
