'use client';

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SendOutlinedIcon from '@mui/icons-material/SendOutlined';
import MailOutlinedIcon from '@mui/icons-material/MailOutlined';
import { type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import { DataTable, EmptyState, PermissionGuard, ConfirmDialog } from '@/components/shared';
import {
  useInvitations,
  useResendInvitationMutation,
  useCancelInvitationMutation,
  useInviteUserMutation,
  InviteUserDialog,
  type Invitation,
} from '@/modules/user-invitations';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import { getAllowedInviteRoles, type InviteUserFormData } from '@/lib/schemas/user.schema';

const STATUS_COLORS = {
  pending:          'warning',
  pending_delivery: 'info',
  accepted:         'success',
  expired:          'error',
  cancelled:        'default',
} as const;

function StatusChip({ status }: { status: Invitation['status'] }) {
  return (
    <Chip
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      color={STATUS_COLORS[status]}
      size="small"
      variant="outlined"
    />
  );
}

export default function InvitationsPage() {
  const { canInviteUsers } = usePermissions();
  const currentRole = useAuthStore((s) => s.role);
  const allowedInviteRoles = getAllowedInviteRoles(currentRole);
  const { data, isLoading, error } = useInvitations();
  const resendMutation = useResendInvitationMutation();
  const cancelMutation = useCancelInvitationMutation();
  const inviteMutation = useInviteUserMutation();

  const [cancelTarget, setCancelTarget] = useState<string | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [formError, setFormError] = useState<string | undefined>();

  const invitations = data?.items ?? [];

  const handleResend = useCallback(
    async (id: string) => {
      await resendMutation.mutateAsync(id);
    },
    [resendMutation],
  );

  const handleConfirmCancel = useCallback(async () => {
    if (!cancelTarget) return;
    await cancelMutation.mutateAsync(cancelTarget);
    setCancelTarget(null);
  }, [cancelMutation, cancelTarget]);

  const handleInvite = useCallback(
    async (data: InviteUserFormData) => {
      try {
        setFormError(undefined);
        await inviteMutation.mutateAsync(data);
        setShowInvite(false);
      } catch (e: unknown) {
        setFormError(e instanceof Error ? e.message : 'An unexpected error occurred');
      }
    },
    [inviteMutation],
  );

  const columns: GridColDef<Invitation>[] = [
    { field: 'email', headerName: 'Email', flex: 1, minWidth: 200 },
    {
      field: 'name',
      headerName: 'Name',
      flex: 1,
      minWidth: 140,
      valueGetter: (_value, row) => [row.firstName, row.lastName].filter(Boolean).join(' ') || '—',
    },
    { field: 'role', headerName: 'Role', width: 150 },
    {
      field: 'status',
      headerName: 'Status',
      width: 120,
      renderCell: (p: GridRenderCellParams<Invitation>) => (
        <StatusChip status={p.row.status} />
      ),
    },
    {
      field: 'expiresAt',
      headerName: 'Expires',
      width: 130,
      renderCell: (p: GridRenderCellParams<Invitation>) =>
        p.row.expiresAt ? new Date(p.row.expiresAt).toLocaleDateString() : '—',
    },
    {
      field: 'createdAt',
      headerName: 'Sent',
      width: 130,
      renderCell: (p: GridRenderCellParams<Invitation>) =>
        p.row.createdAt ? new Date(p.row.createdAt).toLocaleDateString() : '—',
    },
    {
      field: 'actions',
      headerName: '',
      width: 100,
      sortable: false,
      renderCell: (p: GridRenderCellParams<Invitation>) => {
        const inv = p.row;
        if (inv.status !== 'pending' && inv.status !== 'pending_delivery') return null;
        return (
          <Box display="flex" gap={0.5} onClick={(e) => e.stopPropagation()}>
            <Tooltip title="Resend invitation">
              <IconButton
                size="small"
                onClick={() => handleResend(inv.id)}
                disabled={resendMutation.isPending}
              >
                <RefreshOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Cancel invitation">
              <IconButton
                size="small"
                color="error"
                onClick={() => setCancelTarget(inv.id)}
              >
                <CancelOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        );
      },
    },
  ];

  return (
    <Box>
      <PageHeader
        title="Invitations"
        count={invitations.length}
        actions={
          <PermissionGuard allowed={canInviteUsers}>
            <Button
              variant="contained"
              startIcon={<SendOutlinedIcon />}
              onClick={() => {
                setFormError(undefined);
                setShowInvite(true);
              }}
            >
              New Invitation
            </Button>
          </PermissionGuard>
        }
      />

      <DataTable<Invitation>
        columns={columns}
        rows={invitations}
        total={invitations.length}
        page={0}
        pageSize={Math.min(invitations.length || 10, 100)}
        onPageChange={() => {}}
        onPageSizeChange={() => {}}
        loading={isLoading}
        error={error ? new Error('Failed to load invitations.') : null}
        getRowId={(row) => row.id}
        noRowsLabel="No invitations yet."
        emptyState={
          <EmptyState
            icon={MailOutlinedIcon}
            title="No invitations yet"
            description="Invite team members to join your company."
            action={
              <PermissionGuard allowed={canInviteUsers}>
                <Button
                  variant="contained"
                  onClick={() => {
                    setFormError(undefined);
                    setShowInvite(true);
                  }}
                >
                  New Invitation
                </Button>
              </PermissionGuard>
            }
          />
        }
      />

      <ConfirmDialog
        open={Boolean(cancelTarget)}
        title="Cancel Invitation"
        description="Are you sure you want to cancel this invitation? The invite link will stop working immediately."
        confirmLabel="Cancel Invitation"
        danger
        onConfirm={handleConfirmCancel}
        onCancel={() => setCancelTarget(null)}
        loading={cancelMutation.isPending}
      />

      <InviteUserDialog
        open={showInvite}
        roleOptions={allowedInviteRoles}
        onClose={() => setShowInvite(false)}
        onSubmit={handleInvite}
        loading={inviteMutation.isPending}
        error={formError}
      />
    </Box>
  );
}
