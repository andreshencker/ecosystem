import React from 'react';
import Chip from '@mui/material/Chip';

interface StatusBadgeProps {
  active: boolean;
  size?: 'small' | 'medium';
}

export function StatusBadge({ active, size = 'small' }: StatusBadgeProps) {
  return (
    <Chip
      label={active ? 'Active' : 'Inactive'}
      color={active ? 'success' : 'error'}
      size={size}
    />
  );
}
