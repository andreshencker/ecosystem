'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import { FormDrawer, StatusBadge, PermissionGuard } from '@/components/shared';
import { usePermissions } from '@/hooks/usePermissions';
import type { Company } from '@/types/api';

interface KVRowProps {
  label: string;
  value?: React.ReactNode;
}

function KVRow({ label, value }: KVRowProps) {
  return (
    <Box display="flex" gap={2} py={0.75}>
      <Typography
        variant="body2"
        color="text.secondary"
        sx={{ width: 140, flexShrink: 0 }}
      >
        {label}
      </Typography>
      <Typography variant="body2" color="text.primary">
        {value ?? '—'}
      </Typography>
    </Box>
  );
}

interface CompanyViewDrawerProps {
  open: boolean;
  company: Company | null;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function CompanyViewDrawer({
  open,
  company,
  onClose,
  onEdit,
  onDelete,
}: CompanyViewDrawerProps) {
  const { canEditCompany, canDeleteCompany } = usePermissions();

  if (!company) return null;

  const hasActions = canEditCompany || canDeleteCompany;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={company.displayName}
      actions={
        hasActions ? (
          <>
            <PermissionGuard allowed={canDeleteCompany}>
              <Button
                variant="outlined"
                color="error"
                startIcon={<DeleteOutlineOutlinedIcon />}
                onClick={onDelete}
              >
                Delete
              </Button>
            </PermissionGuard>
            <PermissionGuard allowed={canEditCompany}>
              <Button
                variant="contained"
                startIcon={<EditOutlinedIcon />}
                onClick={onEdit}
              >
                Edit
              </Button>
            </PermissionGuard>
          </>
        ) : undefined
      }
    >
      <Stack spacing={0}>
        <KVRow label="Status" value={<StatusBadge active={company.isActive} />} />
        <Divider />
        <KVRow label="Company Key" value={
          <Typography variant="body2" fontFamily="monospace">{company.companyKey}</Typography>
        } />
        <Divider />
        <KVRow label="Display Name" value={company.displayName} />
        <Divider />
        <KVRow label="Legal Name" value={company.legalName} />
        <Divider />
        <KVRow label="Tagline" value={company.tagline} />
        <Divider />
        <KVRow label="Timezone" value={company.timezone} />
        <Divider />
        <KVRow
          label="Created"
          value={new Date(company.createdAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        />
        <Divider />
        <KVRow
          label="Updated"
          value={new Date(company.updatedAt).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          })}
        />
      </Stack>
    </FormDrawer>
  );
}
