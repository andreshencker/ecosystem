'use client';

import React from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import { FormDrawer, StatusBadge, PermissionGuard } from '@/components/shared';
import { usePermissions } from '@/hooks/usePermissions';
import { getRoleConfig } from '@/config/rbac/role-config';
import type { User } from '@/types/api';

// ─── KVRow helper ─────────────────────────────────────────────────────────────

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

// ─── Props ────────────────────────────────────────────────────────────────────

interface UserViewDrawerProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  onEdit: () => void;
  onToggleActive: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function UserViewDrawer({
  open,
  user,
  onClose,
  onEdit,
  onToggleActive,
}: UserViewDrawerProps) {
  const { canManageUsers } = usePermissions();

  if (!user) return null;

  const fullName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') || '—';

  let roleLabel: string;
  try {
    roleLabel = getRoleConfig(user.role).navbar.roleBadgeLabel;
  } catch {
    roleLabel = user.role;
  }

  const isActive = user.isActive !== false;

  return (
    <FormDrawer
      open={open}
      onClose={onClose}
      title={fullName !== '—' ? fullName : user.email}
      actions={
        canManageUsers ? (
          <>
            <PermissionGuard allowed={canManageUsers}>
              <Button
                variant="outlined"
                color={isActive ? 'error' : 'success'}
                startIcon={
                  isActive ? (
                    <BlockOutlinedIcon />
                  ) : (
                    <CheckCircleOutlinedIcon />
                  )
                }
                onClick={onToggleActive}
              >
                {isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </PermissionGuard>
            <PermissionGuard allowed={canManageUsers}>
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
        <KVRow label="Status" value={<StatusBadge active={isActive} />} />
        <Divider />
        <KVRow label="Full Name" value={fullName} />
        <Divider />
        <KVRow label="Email" value={user.email} />
        <Divider />
        <KVRow label="Role" value={roleLabel} />
        <Divider />
        <KVRow label="Scope" value={user.scope} />
        <Divider />
        <KVRow
          label="Business Key"
          value={
            user.businessKey ? (
              <Typography variant="body2" fontFamily="monospace">
                {user.businessKey}
              </Typography>
            ) : undefined
          }
        />
        <Divider />
        <KVRow
          label="Email Verified"
          value={user.isEmailVerified ? 'Yes' : 'No'}
        />
        <Divider />
        <KVRow
          label="Created"
          value={
            user.createdAt
              ? new Date(user.createdAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                })
              : undefined
          }
        />
      </Stack>
    </FormDrawer>
  );
}
