'use client';

import React, { useState, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import AddIcon from '@mui/icons-material/Add';
import BlockOutlinedIcon from '@mui/icons-material/BlockOutlined';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined';
import ClearOutlinedIcon from '@mui/icons-material/ClearOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import GroupOutlinedIcon from '@mui/icons-material/GroupOutlined';
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import RefreshOutlinedIcon from '@mui/icons-material/RefreshOutlined';
import SearchIcon from '@mui/icons-material/Search';
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined';
import { type GridColDef, type GridRenderCellParams } from '@mui/x-data-grid';
import { DataGrid } from '@mui/x-data-grid';
import { PageHeader } from '@/components/layout';
import { ConfirmDialog, EmptyState, PermissionGuard, RowActions } from '@/components/shared';
import { UserViewDrawer, UserEditForm } from '@/components/domain/user';
import {
  useRelayTeamUsers,
  useUpdateRelayTeamMemberMutation,
  useSuspendRelayTeamMemberMutation,
  useActivateRelayTeamMemberMutation,
  useRevokeRelayTeamMemberMutation,
} from '@/hooks/api/useRelayTeam';
import {
  useInvitations,
  useInviteUserMutation,
  useResendInvitationMutation,
  useCancelInvitationMutation,
  InviteUserDialog,
  type Invitation,
} from '@/modules/user-invitations';
import { usePermissions } from '@/hooks/usePermissions';
import { useAuthStore } from '@/stores/auth.store';
import { mapApiError } from '@/lib/mapApiError';
import type { User } from '@/types/api';
import {
  getTeamInviteRoles,
  getVisibleRoleFilters,
  getEditRoleOptions,
  canInviteInBusinessApp,
  type AppContext,
  type UpdateUserFormData,
  type InviteUserFormData,
} from '@/lib/schemas/user.schema';

// ─── Constants ────────────────────────────────────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Platform Admin',
  company_owner:  'Owner',
  company_admin:  'Admin',
  operator:       'Operator',
  viewer:         'Viewer',
};

const ALL_STATUSES: RowStatus[] = ['active', 'inactive', 'pending', 'expired', 'cancelled'];

// ─── Row model ────────────────────────────────────────────────────────────────

type RowSource = 'user' | 'invitation';
type RowStatus = 'active' | 'inactive' | 'pending' | 'expired' | 'cancelled';

interface TeamRow {
  id: string;
  name: string;
  email: string;
  role: string;
  company: string;
  rowStatus: RowStatus;
  source: RowSource;
  invId?: string;
  invStatus?: Invitation['status'];
  expiresAt?: string;
  createdAt?: string;
  _user?: User;
}

function userToRow(u: User): TeamRow {
  return {
    id: u.id,
    name: [u.firstName, u.lastName].filter(Boolean).join(' ') || '—',
    email: u.email,
    role: u.role,
    company: u.scope === 'global' ? 'Platform' : (u.companyKey ?? '—'),
    rowStatus: u.isActive !== false ? 'active' : 'inactive',
    source: 'user',
    createdAt: u.createdAt,
    _user: u,
  };
}

function inviteToRow(inv: Invitation): TeamRow {
  const s = inv.status;
  const rowStatus: RowStatus =
    s === 'pending' ? 'pending' : s === 'cancelled' ? 'cancelled' : 'expired';
  return {
    id: `inv-${inv.id}`,
    invId: inv.id,
    name: [inv.firstName, inv.lastName].filter(Boolean).join(' ') || '—',
    email: inv.email,
    role: inv.role,
    company: inv.companyKey ?? 'Platform',
    rowStatus,
    source: 'invitation',
    invStatus: inv.status,
    expiresAt: inv.expiresAt,
    createdAt: inv.createdAt,
  };
}

// ─── Status chip ──────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<RowStatus, 'success' | 'default' | 'warning' | 'error'> = {
  active:    'success',
  inactive:  'default',
  pending:   'warning',
  expired:   'error',
  cancelled: 'default',
};

function StatusChip({ status }: { status: RowStatus }) {
  return (
    <Chip
      label={status.charAt(0).toUpperCase() + status.slice(1)}
      color={STATUS_COLORS[status]}
      size="small"
      variant={status === 'active' ? 'filled' : 'outlined'}
    />
  );
}

// ─── Mobile card ──────────────────────────────────────────────────────────────

interface CardActionsProps {
  row: TeamRow;
  canManageUsers: boolean;
  canDeactivateUsers: boolean;
  canDeleteUsers: boolean;
  isSelf: boolean;
  onView: () => void;
  onEdit: () => void;
  onDeactivate: () => void;
  onReactivate: () => void;
  onDelete: () => void;
  onResend: () => void;
  onCancelInvite: () => void;
  resendPending: boolean;
}

function TeamRowCard({
  row,
  canManageUsers,
  canDeactivateUsers,
  canDeleteUsers,
  isSelf,
  onView,
  onEdit,
  onDeactivate,
  onReactivate,
  onDelete,
  onResend,
  onCancelInvite,
  resendPending,
}: CardActionsProps) {
  const isActive = row._user?.isActive !== false;

  return (
    <Card variant="outlined" sx={{ borderRadius: 2 }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header row: name + status */}
        <Box display="flex" justifyContent="space-between" alignItems="flex-start" gap={1}>
          <Box flex={1} minWidth={0}>
            <Typography variant="subtitle2" fontWeight={600} noWrap>
              {row.name}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              fontFamily="monospace"
              display="block"
              noWrap
            >
              {row.email}
            </Typography>
          </Box>
          <StatusChip status={row.rowStatus} />
        </Box>

        {/* Meta row */}
        <Box display="flex" flexWrap="wrap" gap={0.5} mt={1} alignItems="center">
          <Typography variant="caption" color="text.secondary">
            {ROLE_LABELS[row.role] ?? row.role}
          </Typography>
          <Typography variant="caption" color="text.disabled">·</Typography>
          <Typography variant="caption" color="text.secondary">
            {row.createdAt ? new Date(row.createdAt).toLocaleDateString() : '—'}
          </Typography>
          {row.source === 'invitation' && row.expiresAt && (
            <>
              <Typography variant="caption" color="text.disabled">·</Typography>
              <Typography variant="caption" color="text.secondary">
                Expires {new Date(row.expiresAt).toLocaleDateString()}
              </Typography>
            </>
          )}
        </Box>

        <Divider sx={{ my: 1 }} />

        {/* Actions */}
        <Box display="flex" gap={0.5} justifyContent="flex-end">
          {row.source === 'invitation' ? (
            (row.invStatus === 'pending' || row.invStatus === 'pending_delivery') ? (
              <>
                <Tooltip title="Resend invitation">
                  <IconButton size="small" onClick={onResend} disabled={resendPending}>
                    <RefreshOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel invitation">
                  <IconButton size="small" color="error" onClick={onCancelInvite}>
                    <CancelOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </>
            ) : null
          ) : (
            <>
              <Tooltip title="View details">
                <IconButton size="small" onClick={onView}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              {canManageUsers && (
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={onEdit}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
              {canDeactivateUsers && (
                <Tooltip title={isActive ? 'Deactivate' : 'Reactivate'}>
                  <IconButton
                    size="small"
                    color={isActive ? 'warning' : 'success'}
                    onClick={isActive ? onDeactivate : onReactivate}
                  >
                    {isActive
                      ? <BlockOutlinedIcon fontSize="small" />
                      : <CheckCircleOutlinedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              )}
              {canDeleteUsers && !isSelf && (
                <Tooltip title="Revoke Relay access">
                  <IconButton size="small" color="error" onClick={onDelete}>
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ConfirmAction =
  | { type: 'deactivate'; user: User }
  | { type: 'reactivate'; user: User }
  | { type: 'delete'; user: User }
  | { type: 'cancel-invite'; invId: string; email: string }
  | null;

type DrawerMode = 'none' | 'view' | 'edit' | 'invite';

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function TeamPage() {
  const currentRole   = useAuthStore((s) => s.role);
  const currentUserId = useAuthStore((s) => s.user?.grapiflyUserId ?? s.user?.id ?? null);
  // Team always represents access to Relay in the selected organization,
  // including when that organization is Grapifly's own platform workspace.
  const appContext: AppContext = 'company';

  const allowedInviteRoles = getTeamInviteRoles(currentRole);
  const roleFilterOptions  = getVisibleRoleFilters(currentRole, appContext);
  const editRoleOptions    = getEditRoleOptions(currentRole, appContext);
  const canInvite          = canInviteInBusinessApp(currentRole);

  const { canManageUsers, canDeleteUsers, canDeactivateUsers } =
    usePermissions();

  // ── Filters ────────────────────────────────────────────────────────────────
  const [page, setPage]                 = useState(0);
  const [pageSize]                      = useState(50);
  const [search, setSearch]             = useState('');
  const [roleFilter, setRoleFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const hasActiveFilters = Boolean(search || roleFilter || statusFilter);

  const clearFilters = useCallback(() => {
    setSearch('');
    setRoleFilter('');
    setStatusFilter('');
    setPage(0);
  }, []);

  // ── Drawers / dialogs ──────────────────────────────────────────────────────
  const [drawerMode, setDrawerMode]   = useState<DrawerMode>('none');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [formError, setFormError]     = useState<string | undefined>();
  const [confirmAction, setConfirmAction] = useState<ConfirmAction>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: usersData, isLoading: usersLoading } = useRelayTeamUsers();
  const { data: invData, isLoading: invLoading } = useInvitations();

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateMutation           = useUpdateRelayTeamMemberMutation();
  const inviteMutation           = useInviteUserMutation();
  const deactivateMutation       = useSuspendRelayTeamMemberMutation();
  const reactivateMutation       = useActivateRelayTeamMemberMutation();
  const deleteMutation           = useRevokeRelayTeamMemberMutation();
  const resendMutation           = useResendInvitationMutation();
  const cancelInviteMutation     = useCancelInvitationMutation();

  // ── Rows ───────────────────────────────────────────────────────────────────
  const allRows = useMemo<TeamRow[]>(() => {
    const users = usersData?.items ?? [];

    // Users are the source of truth. Build lookup sets to deduplicate invitations.
    const userIds    = new Set(users.map((u) => String(u.id)));
    const userEmails = new Set(users.map((u) => u.email.toLowerCase().trim()));

    const userRows = users.map(userToRow);

    const invRows = (invData?.items ?? [])
      .filter((inv) => {
        // Cancelled invitations have no actionable state — hide from Team.
        if (inv.status === 'cancelled') return false;
        // A real User already exists for this invite — User row wins.
        if (inv.userId && userIds.has(String(inv.userId))) return false;
        if (userEmails.has(inv.email.toLowerCase().trim())) return false;
        return true;
      })
      .map(inviteToRow);

    return [...userRows, ...invRows].sort(
      (a, b) =>
        new Date(b.createdAt ?? 0).getTime() -
        new Date(a.createdAt ?? 0).getTime(),
    );
  }, [usersData, invData]);

  const filteredRows = useMemo(() => {
    let rows = allRows;

    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q),
      );
    }
    if (roleFilter)   rows = rows.filter((r) => r.role === roleFilter);
    if (statusFilter) rows = rows.filter((r) => r.rowStatus === statusFilter);
    return rows;
  }, [allRows, search, roleFilter, statusFilter]);

  const isLoading = usersLoading || invLoading;

  // ── Mobile pagination ──────────────────────────────────────────────────────
  const totalPages   = Math.ceil(filteredRows.length / pageSize);
  const paginatedRows = filteredRows.slice(page * pageSize, (page + 1) * pageSize);

  // ── Drawer helpers ─────────────────────────────────────────────────────────
  const openView = useCallback((row: TeamRow) => {
    if (row._user) { setSelectedUser(row._user); setDrawerMode('view'); }
  }, []);

  const openEdit = useCallback((row: TeamRow) => {
    if (row._user) { setFormError(undefined); setSelectedUser(row._user); setDrawerMode('edit'); }
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerMode('none'); setSelectedUser(null); setFormError(undefined);
  }, []);

  // ── Mutation handlers ──────────────────────────────────────────────────────
  const handleEdit = useCallback(async (data: UpdateUserFormData) => {
    if (!selectedUser) return;
    try {
      setFormError(undefined);
      await updateMutation.mutateAsync({ id: selectedUser.id, ...data });
      closeDrawer();
    } catch (e: unknown) {
      setFormError(e instanceof Error ? e.message : 'An unexpected error occurred.');
    }
  }, [updateMutation, selectedUser, closeDrawer]);

  const handleInvite = useCallback(async (data: InviteUserFormData) => {
    try {
      setFormError(undefined);
      await inviteMutation.mutateAsync(data);
      closeDrawer();
    } catch (e: unknown) {
      setFormError(mapApiError(e));
    }
  }, [inviteMutation, closeDrawer]);

  const execConfirmAction = useCallback(async () => {
    if (!confirmAction) return;
    try {
      if (confirmAction.type === 'deactivate') {
        await deactivateMutation.mutateAsync(confirmAction.user.id);
      } else if (confirmAction.type === 'reactivate') {
        await reactivateMutation.mutateAsync(confirmAction.user.id);
      } else if (confirmAction.type === 'delete') {
        await deleteMutation.mutateAsync(confirmAction.user.id);
        if (selectedUser?.id === confirmAction.user.id) closeDrawer();
      } else if (confirmAction.type === 'cancel-invite') {
        await cancelInviteMutation.mutateAsync(confirmAction.invId);
      }
    } finally {
      setConfirmAction(null);
    }
  }, [
    confirmAction, deactivateMutation, reactivateMutation,
    deleteMutation, cancelInviteMutation, selectedUser, closeDrawer,
  ]);

  const confirmPending =
    deactivateMutation.isPending || reactivateMutation.isPending ||
    deleteMutation.isPending ||
    cancelInviteMutation.isPending;

  const confirmText = useMemo(() => {
    if (!confirmAction) return { title: '', description: '', label: '' };
    if (confirmAction.type === 'deactivate') return {
      title: 'Deactivate User',
      description: `${confirmAction.user.email} will immediately lose access. You can reactivate them later.`,
      label: 'Deactivate',
    };
    if (confirmAction.type === 'reactivate') return {
      title: 'Reactivate User',
      description: `${confirmAction.user.email} will regain access to the portal.`,
      label: 'Reactivate',
    };
    if (confirmAction.type === 'delete') return {
      title: 'Revoke Relay Access',
      description: `${confirmAction.user.email} will be removed from Relay while their Grapifly account and organization membership remain intact.`,
      label: 'Revoke Access',
    };
    return {
      title: 'Cancel Invitation',
      description: `The invitation to ${confirmAction.email} will be cancelled immediately.`,
      label: 'Cancel Invitation',
    };
  }, [confirmAction]);

  // ── Desktop columns ────────────────────────────────────────────────────────
  const columns = useMemo<GridColDef<TeamRow>[]>(() => {
    const cols: GridColDef<TeamRow>[] = [
      {
        field: 'name',
        headerName: 'Name',
        flex: 1,
        minWidth: 130,
        renderCell: (p: GridRenderCellParams<TeamRow>) => (
          <Typography variant="body2" fontWeight={500} noWrap>
            {p.row.name}
          </Typography>
        ),
      },
      {
        field: 'email',
        headerName: 'Email',
        flex: 1.5,
        minWidth: 190,
        renderCell: (p: GridRenderCellParams<TeamRow>) => (
          <Typography variant="body2" color="text.secondary" fontFamily="monospace" fontSize={12} noWrap>
            {p.row.email}
          </Typography>
        ),
      },
      {
        field: 'role',
        headerName: 'Role',
        width: 130,
        renderCell: (p: GridRenderCellParams<TeamRow>) => (
          <Typography variant="body2">{ROLE_LABELS[p.row.role] ?? p.row.role}</Typography>
        ),
      },
    ];

    cols.push(
      {
        field: 'rowStatus',
        headerName: 'Status',
        width: 105,
        renderCell: (p: GridRenderCellParams<TeamRow>) => <StatusChip status={p.row.rowStatus} />,
      },
      {
        field: 'createdAt',
        headerName: 'Created',
        width: 100,
        renderCell: (p: GridRenderCellParams<TeamRow>) =>
          p.row.createdAt ? new Date(p.row.createdAt).toLocaleDateString() : '—',
      },
      {
        field: 'actions',
        headerName: 'Actions',
        width: 220,
        sortable: false,
        align: 'right',
        headerAlign: 'right',
        renderCell: (p: GridRenderCellParams<TeamRow>) => {
          const row = p.row;
          if (row.source === 'invitation') {
            if (row.invStatus !== 'pending' && row.invStatus !== 'pending_delivery') return null;
            return (
              <RowActions onClick={(e) => e.stopPropagation()}>
                <Tooltip title="Resend invitation">
                  <IconButton size="small" onClick={() => resendMutation.mutate(row.invId!)} disabled={resendMutation.isPending}>
                    <RefreshOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Cancel invitation">
                  <IconButton size="small" color="error" onClick={() => setConfirmAction({ type: 'cancel-invite', invId: row.invId!, email: row.email })}>
                    <CancelOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </RowActions>
            );
          }
          const u = row._user!;
          const isActive = u.isActive !== false;
          const isSelf   = u.id === currentUserId;
          return (
            <RowActions onClick={(e) => e.stopPropagation()}>
              <Tooltip title="View details">
                <IconButton size="small" onClick={() => openView(row)}>
                  <VisibilityOutlinedIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <PermissionGuard allowed={canManageUsers}>
                <Tooltip title="Edit">
                  <IconButton size="small" onClick={() => openEdit(row)}>
                    <EditOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              </PermissionGuard>
              <PermissionGuard allowed={canDeactivateUsers}>
                <Tooltip title={isActive ? 'Deactivate' : 'Reactivate'}>
                  <IconButton size="small" color={isActive ? 'warning' : 'success'}
                    onClick={() => setConfirmAction({ type: isActive ? 'deactivate' : 'reactivate', user: u })}>
                    {isActive ? <BlockOutlinedIcon fontSize="small" /> : <CheckCircleOutlinedIcon fontSize="small" />}
                  </IconButton>
                </Tooltip>
              </PermissionGuard>
              {canDeleteUsers && !isSelf && (
                <Tooltip title="Revoke Relay access">
                  <IconButton size="small" color="error" onClick={() => setConfirmAction({ type: 'delete', user: u })}>
                    <DeleteOutlineOutlinedIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </RowActions>
          );
        },
      },
    );
    return cols;
  }, [canManageUsers, canDeactivateUsers, canDeleteUsers, currentUserId, openView, openEdit, resendMutation]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Box display="flex" flexDirection="column" flex={1} minHeight={0} sx={{ minWidth: 0, overflowX: 'hidden' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <PageHeader
        title="Team"
        count={filteredRows.length}
        actions={
          canInvite ? (
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => { setFormError(undefined); setDrawerMode('invite'); }}
            >
              Invite User
            </Button>
          ) : undefined
        }
      />

      {/* ── Filter toolbar ─────────────────────────────────────────────────── */}
      {/*
        Width strategy:
          xs (<600 px)  — full width, stacked vertically     (mobile)
          sm (600 px+)  — fixed pixel widths, wrap naturally (tablet / desktop)
        The `flexWrap: 'wrap'` container handles wrapping at any width
        without causing body overflow.
      */}
      <Paper variant="outlined" sx={{ p: 1.5, mb: 2, borderRadius: 2, flexShrink: 0 }}>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>

          <TextField
            size="small"
            placeholder="Search name or email…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ width: { xs: '100%', sm: 200 } }}
          />

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 150 } }}>
            <InputLabel>Role</InputLabel>
            <Select value={roleFilter} label="Role" onChange={(e) => { setRoleFilter(e.target.value); setPage(0); }}>
              <MenuItem value=""><em>All roles</em></MenuItem>
              {roleFilterOptions.map((r) => (
                <MenuItem key={r.value} value={r.value}>{r.label}</MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl size="small" sx={{ width: { xs: '100%', sm: 150 } }}>
            <InputLabel>Status</InputLabel>
            <Select value={statusFilter} label="Status" onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}>
              <MenuItem value=""><em>All statuses</em></MenuItem>
              {ALL_STATUSES.map((s) => (
                <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>
              ))}
            </Select>
          </FormControl>

          {hasActiveFilters && (
            <Button
              size="small"
              variant="text"
              startIcon={<ClearOutlinedIcon fontSize="small" />}
              onClick={clearFilters}
              sx={{ width: { xs: '100%', sm: 'auto' }, whiteSpace: 'nowrap' }}
            >
              Clear
            </Button>
          )}
        </Box>
      </Paper>

      {/*
        ── Responsive layout switch ────────────────────────────────────────────
        Both containers are always in the DOM. CSS `display` controls which
        one is visible. This avoids any SSR/hydration mismatch from
        useMediaQuery while guaranteeing the correct layout at every width.

        Card list  — visible when width < md (900 px): xs, sm
        DataGrid   — visible when width ≥ md (900 px)
      */}

      {/* ── Card list (xs / sm — below 900 px) ───────────────────────────── */}
      {/* No overflowY/flex-height here — AppShell section is the scroll container */}
      <Box
        sx={{
          display: { xs: 'flex', md: 'none' },
          flexDirection: 'column',
          pb: 2,
        }}
      >
        {isLoading ? (
          <Typography color="text.secondary" textAlign="center" py={4}>
            Loading…
          </Typography>
        ) : paginatedRows.length === 0 ? (
          <Box py={6}>
            <EmptyState
              icon={GroupOutlinedIcon}
              title={hasActiveFilters ? 'No results match your filters' : 'No team members yet'}
              description={
                hasActiveFilters
                  ? 'Try adjusting your search or clearing the filters.'
                  : 'Invite your first team member to start collaborating.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outlined" onClick={clearFilters}>Clear filters</Button>
                ) : canInvite ? (
                  <Button variant="contained" onClick={() => { setFormError(undefined); setDrawerMode('invite'); }}>
                    Invite User
                  </Button>
                ) : undefined
              }
            />
          </Box>
        ) : (
          <Box display="flex" flexDirection="column" gap={1.5}>
            {paginatedRows.map((row) => (
              <TeamRowCard
                key={row.id}
                row={row}
                canManageUsers={canManageUsers}
                canDeactivateUsers={canDeactivateUsers}
                canDeleteUsers={canDeleteUsers}
                isSelf={row._user?.id === currentUserId}
                onView={() => openView(row)}
                onEdit={() => openEdit(row)}
                onDeactivate={() => row._user && setConfirmAction({ type: 'deactivate', user: row._user })}
                onReactivate={() => row._user && setConfirmAction({ type: 'reactivate', user: row._user })}
                onDelete={() => row._user && setConfirmAction({ type: 'delete', user: row._user })}
                onResend={() => resendMutation.mutate(row.invId!)}
                onCancelInvite={() => setConfirmAction({ type: 'cancel-invite', invId: row.invId!, email: row.email })}
                resendPending={resendMutation.isPending}
              />
            ))}
          </Box>
        )}

        {/* Card-list pagination */}
        {totalPages > 1 && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mt={2} py={1}>
            <Typography variant="caption" color="text.secondary">
              {page * pageSize + 1}–{Math.min((page + 1) * pageSize, filteredRows.length)} of {filteredRows.length}
            </Typography>
            <Box display="flex" gap={0.5}>
              <IconButton size="small" disabled={page === 0} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
                <NavigateBeforeIcon fontSize="small" />
              </IconButton>
              <IconButton size="small" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
                <NavigateNextIcon fontSize="small" />
              </IconButton>
            </Box>
          </Box>
        )}
      </Box>

      {/* ── DataGrid (md+ — 900 px and above) ───────────────────────────────── */}
      <Box sx={{ display: { xs: 'none', md: 'block' }, minHeight: 400, width: '100%', pb: 2 }}>
        <DataGrid
          rows={filteredRows}
          columns={columns}
          getRowId={(row) => row.id}
          paginationMode="client"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => {
            if (m.page !== page) setPage(m.page);
          }}
          pageSizeOptions={[25, 50, 100]}
          loading={isLoading}
          onRowClick={(p) => p.row.source === 'user' && openView(p.row as TeamRow)}
          disableRowSelectionOnClick
          getRowHeight={() => 52}
          autoHeight
          sx={{
            border: 'none',
            '& .MuiDataGrid-columnHeaders': {
              backgroundColor: 'background.default',
              borderBottom: '2px solid',
              borderColor: 'divider',
            },
            '& .MuiDataGrid-columnHeaderTitle': {
              fontWeight: 600,
              fontSize: '0.75rem',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              color: 'text.secondary',
            },
            '& .MuiDataGrid-row': {
              cursor: 'pointer',
              '&:hover': { backgroundColor: 'action.hover' },
            },
            '& .MuiDataGrid-cell': {
              borderColor: 'divider',
              display: 'flex',
              alignItems: 'center',
            },
            '& .MuiDataGrid-footerContainer': {
              borderTop: '1px solid',
              borderColor: 'divider',
              backgroundColor: 'background.default',
            },
          }}
          slots={{
            noRowsOverlay: () => (
              <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                <EmptyState
                  icon={GroupOutlinedIcon}
                  title={hasActiveFilters ? 'No results match your filters' : 'No team members yet'}
                  description={
                    hasActiveFilters
                      ? 'Try adjusting your search or clearing the filters.'
                      : 'Invite your first team member to start collaborating.'
                  }
                  action={
                    !hasActiveFilters && canInvite ? (
                      <Button variant="contained" onClick={() => { setFormError(undefined); setDrawerMode('invite'); }}>
                        Invite User
                      </Button>
                    ) : (
                      <Button variant="outlined" onClick={clearFilters}>Clear filters</Button>
                    )
                  }
                />
              </Box>
            ),
          }}
        />
      </Box>

      {/* ── Drawers ─────────────────────────────────────────────────────────── */}
      <UserViewDrawer
        open={drawerMode === 'view'}
        user={selectedUser}
        onClose={closeDrawer}
        onEdit={() => openEdit(allRows.find((r) => r._user?.id === selectedUser?.id)!)}
        onToggleActive={() => {
          if (!selectedUser) return;
          const isActive = selectedUser.isActive !== false;
          setConfirmAction({ type: isActive ? 'deactivate' : 'reactivate', user: selectedUser });
        }}
      />

      <UserEditForm
        open={drawerMode === 'edit'}
        user={selectedUser}
        roleOptions={editRoleOptions}
        onClose={closeDrawer}
        onSubmit={handleEdit}
        loading={updateMutation.isPending}
        error={formError}
      />

      <InviteUserDialog
        open={drawerMode === 'invite'}
        roleOptions={allowedInviteRoles}
        onClose={closeDrawer}
        onSubmit={handleInvite}
        loading={inviteMutation.isPending}
        error={formError}
      />

      <ConfirmDialog
        open={Boolean(confirmAction)}
        title={confirmText.title}
        description={confirmText.description}
        confirmLabel={confirmText.label}
        danger={confirmAction?.type === 'delete' || confirmAction?.type === 'cancel-invite'}
        onConfirm={execConfirmAction}
        onCancel={() => setConfirmAction(null)}
        loading={confirmPending}
      />
    </Box>
  );
}
