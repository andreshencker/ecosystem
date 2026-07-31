import React from 'react';
import Chip from '@mui/material/Chip';
import type { PaymentMethodConfigurationStatus } from '@/types/payments';

const STATUS_CONFIG: Record<
  PaymentMethodConfigurationStatus,
  { label: string; color: 'success' | 'warning' | 'info' | 'error' | 'default' }
> = {
  active:      { label: 'Active',      color: 'success'  },
  inactive:    { label: 'Inactive',    color: 'default'  },
  pending:     { label: 'Pending',     color: 'warning'  },
  restricted:  { label: 'Restricted',  color: 'warning'  },
  unsupported: { label: 'Unsupported', color: 'error'    },
};

interface PaymentMethodStatusBadgeProps {
  status: PaymentMethodConfigurationStatus;
  size?: 'small' | 'medium';
}

export function PaymentMethodStatusBadge({
  status,
  size = 'small',
}: PaymentMethodStatusBadgeProps) {
  const config = STATUS_CONFIG[status] ?? { label: status, color: 'default' as const };
  const isInactive = status === 'inactive';
  return (
    <Chip
      label={config.label}
      color={config.color}
      size={size}
      variant={isInactive ? 'outlined' : 'filled'}
    />
  );
}
