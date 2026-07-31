import React from 'react';
import Chip from '@mui/material/Chip';
import type { PaymentAccountCapability } from '@/types/payments';

type CapabilityStatus = PaymentAccountCapability['status'];

const STATUS_CONFIG: Record<
  CapabilityStatus,
  {
    label: string;
    color: 'success' | 'warning' | 'default' | 'error';
    variant: 'filled' | 'outlined';
  }
> = {
  active:      { label: 'Available',   color: 'success', variant: 'filled'   },
  inactive:    { label: 'Planned',     color: 'default', variant: 'outlined' },
  pending:     { label: 'Pending',     color: 'warning', variant: 'filled'   },
  restricted:  { label: 'Restricted',  color: 'warning', variant: 'outlined' },
  unsupported: { label: 'Unsupported', color: 'default', variant: 'outlined' },
};

interface PaymentCapabilityChipProps {
  status: CapabilityStatus;
  size?: 'small' | 'medium';
}

export function PaymentCapabilityChip({
  status,
  size = 'small',
}: PaymentCapabilityChipProps) {
  const config = STATUS_CONFIG[status] ?? {
    label: status,
    color: 'default' as const,
    variant: 'outlined' as const,
  };
  return (
    <Chip
      label={config.label}
      color={config.color}
      variant={config.variant}
      size={size}
    />
  );
}
