import * as React from "react";
import { Avatar, Box, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import toast from "react-hot-toast";
import PersonAddAlt1Icon from "@mui/icons-material/PersonAddAlt1";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import AutorenewIcon from "@mui/icons-material/Autorenew";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { QueryError } from "@/components/shared/QueryError";

import InviteTeamMemberForm from "@/components/domain/team/InviteTeamMemberForm";
import EditTeamMemberForm from "@/components/domain/team/EditTeamMemberForm";
import InviteLinkDialog from "@/components/domain/team/InviteLinkDialog";

import type { InviteTeamMemberPayload, TeamInvitation, TeamMember, UpdateTeamMemberPayload } from "@/types/team";
import {
    useCancelInvitation,
    useInviteTeamMember,
    useRegenerateInvitation,
    useTeam,
    useUpdateTeamMember,
} from "@/hooks/api/useTeam";
import { useListState } from "@/hooks/useListState";
import { errorToMessage } from "@/lib/utils";

const roleColor = (role: string): "default" | "primary" | "info" =>
    role === "owner" ? "primary" : role === "admin" ? "info" : "default";

const memberStatusColor = (status: string): "success" | "warning" | "error" | "default" =>
    status === "active" ? "success" : status === "suspended" ? "warning" : status === "revoked" ? "error" : "default";

const inviteStatusColor = (status: string): "warning" | "default" | "error" =>
    status === "pending" ? "warning" : status === "expired" ? "error" : "default";

const fmtDate = (value?: string) => (value ? new Date(value).toLocaleDateString() : "—");

export default function TeamPage() {
    const q = useTeam();
    const members = q.data?.members ?? [];
    const invitations = q.data?.invitations ?? [];

    const list = useListState();
    const roleFilter = list.filters["role"] ?? "";

    const filteredMembers = React.useMemo(() => {
        let rows = members;
        const query = list.debouncedSearch.trim().toLowerCase();
        if (query) {
            rows = rows.filter(
                (m) =>
                    m.displayName?.toLowerCase().includes(query) ||
                    m.email?.toLowerCase().includes(query),
            );
        }
        if (roleFilter) rows = rows.filter((m) => m.role === roleFilter);
        return rows;
    }, [members, list.debouncedSearch, roleFilter]);

    const pendingInvitations = React.useMemo(
        () => invitations.filter((i) => i.status === "pending" || i.status === "expired"),
        [invitations],
    );

    const inviteMutation = useInviteTeamMember();
    const updateMutation = useUpdateTeamMember();
    const regenerateMutation = useRegenerateInvitation();
    const cancelMutation = useCancelInvitation();

    const [inviteOpen, setInviteOpen] = React.useState(false);
    const [editing, setEditing] = React.useState<TeamMember | null>(null);
    const [pendingCancel, setPendingCancel] = React.useState<TeamInvitation | null>(null);
    const [linkDialog, setLinkDialog] = React.useState<{ url: string | null; email?: string } | null>(null);

    const handleInvite = async (values: InviteTeamMemberPayload) => {
        try {
            const result = await inviteMutation.mutateAsync(values);
            setInviteOpen(false);
            if (result.accessGranted) {
                toast.success(`${values.email} already had a Grapifly account and was added to the team.`);
            } else if (result.inviteUrl) {
                setLinkDialog({ url: result.inviteUrl, email: values.email });
            } else {
                toast.success("Invitation sent.");
            }
        } catch (err) {
            toast.error(errorToMessage(err, "Could not send the invitation."));
        }
    };

    const handleUpdate = async (patch: UpdateTeamMemberPayload) => {
        if (!editing) return;
        try {
            await updateMutation.mutateAsync({ grapiflyUserId: editing.grapiflyUserId, data: patch });
            setEditing(null);
            toast.success("Member updated.");
        } catch (err) {
            toast.error(errorToMessage(err, "Could not update the member."));
        }
    };

    const handleRegenerate = async (invitation: TeamInvitation) => {
        try {
            const result = await regenerateMutation.mutateAsync(invitation.invitationId);
            setLinkDialog({ url: result.inviteUrl, email: invitation.email });
        } catch (err) {
            toast.error(errorToMessage(err, "Could not regenerate the invitation."));
        }
    };

    const handleCancel = async () => {
        if (!pendingCancel) return;
        try {
            await cancelMutation.mutateAsync(pendingCancel.invitationId);
            setPendingCancel(null);
            toast.success("Invitation cancelled.");
        } catch (err) {
            toast.error(errorToMessage(err, "Could not cancel the invitation."));
        }
    };

    const memberColumns: GridColDef<TeamMember>[] = [
        {
            field: "displayName",
            headerName: "Member",
            flex: 1.4,
            minWidth: 220,
            renderCell: (params) => (
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                    <Avatar src={params.row.avatarUrl ?? undefined} sx={{ width: 32, height: 32 }}>
                        {(params.row.displayName || params.row.email || "?").charAt(0).toUpperCase()}
                    </Avatar>
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="body2" fontWeight={600} noWrap>{params.row.displayName || "—"}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap display="block">{params.row.email}</Typography>
                    </Box>
                </Stack>
            ),
        },
        {
            field: "role",
            headerName: "Role",
            width: 120,
            renderCell: (params) => (
                <Chip label={params.value} size="small" color={roleColor(params.value)} variant="outlined" sx={{ textTransform: "capitalize" }} />
            ),
        },
        {
            field: "status",
            headerName: "Access",
            width: 120,
            renderCell: (params) => (
                <Chip label={params.value} size="small" color={memberStatusColor(params.value)} variant="outlined" sx={{ textTransform: "capitalize" }} />
            ),
        },
        {
            field: "createdAt",
            headerName: "Joined",
            width: 130,
            valueFormatter: (value) => fmtDate(value as string),
        },
    ];

    const invitationColumns: GridColDef<TeamInvitation>[] = [
        { field: "email", headerName: "Email", flex: 1.4, minWidth: 220 },
        {
            field: "role",
            headerName: "Role",
            width: 120,
            renderCell: (params) => (
                <Chip label={params.value} size="small" color={roleColor(params.value)} variant="outlined" sx={{ textTransform: "capitalize" }} />
            ),
        },
        {
            field: "status",
            headerName: "Status",
            width: 120,
            renderCell: (params) => (
                <Chip label={params.value} size="small" color={inviteStatusColor(params.value)} variant="outlined" sx={{ textTransform: "capitalize" }} />
            ),
        },
        {
            field: "expiresAt",
            headerName: "Expires",
            width: 130,
            valueFormatter: (value) => fmtDate(value as string),
        },
    ];

    return (
        <>
            <PageHeader
                title="Team"
                count={members.length}
                subtitle="Invite teammates to your provider organization and manage their access to jtrade."
                actions={
                    <LoadingButton
                        variant="contained"
                        startIcon={<PersonAddAlt1Icon />}
                        onClick={() => setInviteOpen(true)}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                    >
                        Invite member
                    </LoadingButton>
                }
            />

            <SearchToolbar
                search={list.search}
                onSearchChange={list.setSearch}
                placeholder="Search name or email…"
                hasActiveFilters={list.hasActiveFilters}
                onClearFilters={list.clearFilters}
            >
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Role</InputLabel>
                    <Select value={roleFilter} label="Role" onChange={(e) => list.setFilter("role", e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="owner">Owner</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                        <MenuItem value="member">Member</MenuItem>
                    </Select>
                </FormControl>
            </SearchToolbar>

            {q.isError && (
                <Box mb={2}>
                    <QueryError
                        message={errorToMessage(q.error, "Could not load your team. Make sure your organization has jtrade enabled.")}
                        onRetry={() => void q.refetch()}
                    />
                </Box>
            )}

            <DataTable<TeamMember>
                columns={memberColumns}
                rows={filteredMembers}
                total={filteredMembers.length}
                page={0}
                pageSize={50}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                getRowId={(row) => row.grapiflyUserId}
                error={q.isError ? (q.error as Error) : null}
                onRowClick={(row) => setEditing(row)}
                rowActions={(row) => (
                    <Tooltip title="Edit access">
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditing(row); }}>
                            <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
                emptyState={
                    list.hasActiveFilters ? (
                        <EmptyState
                            title="No members match your filters"
                            description="Try adjusting your search or clearing the filters."
                            action={<LoadingButton variant="outlined" onClick={list.clearFilters}>Clear filters</LoadingButton>}
                        />
                    ) : (
                        <EmptyState title="No team members yet" description="Invite someone to collaborate on your organization." />
                    )
                }
                mobileCardConfig={{
                    primaryText: (row) => row.displayName || row.email,
                    secondaryText: "email",
                    badge: (row) => <Chip label={row.role} size="small" color={roleColor(row.role)} sx={{ textTransform: "capitalize" }} />,
                    fields: [
                        { field: "status", label: "Access", render: (v) => <Chip label={String(v)} size="small" color={memberStatusColor(String(v))} sx={{ textTransform: "capitalize" }} /> },
                        { field: "createdAt", label: "Joined", render: (v) => fmtDate(v as string) },
                    ],
                }}
            />

            {pendingInvitations.length > 0 && (
                <Box mt={4}>
                    <Typography variant="h6" sx={{ mb: 1.5 }}>Pending invitations</Typography>
                    <DataTable<TeamInvitation>
                        columns={invitationColumns}
                        rows={pendingInvitations}
                        total={pendingInvitations.length}
                        page={0}
                        pageSize={50}
                        onPageChange={() => {}}
                        onPageSizeChange={() => {}}
                        loading={q.isFetching}
                        getRowId={(row) => row.invitationId}
                        rowActions={(row) => (
                            <>
                                <Tooltip title="Regenerate link">
                                    <IconButton
                                        size="small"
                                        disabled={regenerateMutation.isPending}
                                        onClick={(e) => { e.stopPropagation(); void handleRegenerate(row); }}
                                    >
                                        <AutorenewIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Cancel invitation">
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setPendingCancel(row); }}>
                                        <CancelOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                        mobileCardConfig={{
                            primaryText: "email",
                            secondaryText: (row) => `Expires ${fmtDate(row.expiresAt)}`,
                            badge: (row) => <Chip label={row.status} size="small" color={inviteStatusColor(row.status)} sx={{ textTransform: "capitalize" }} />,
                            fields: [
                                { field: "role", label: "Role" },
                            ],
                        }}
                    />
                </Box>
            )}

            <FormDrawer open={inviteOpen} onClose={() => setInviteOpen(false)} title="Invite team member">
                <InviteTeamMemberForm
                    loading={inviteMutation.isPending}
                    onSubmit={handleInvite}
                    onCancel={() => setInviteOpen(false)}
                />
            </FormDrawer>

            <FormDrawer open={!!editing} onClose={() => setEditing(null)} title="Edit member">
                {editing && (
                    <EditTeamMemberForm
                        member={editing}
                        loading={updateMutation.isPending}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditing(null)}
                    />
                )}
            </FormDrawer>

            <ConfirmDialog
                open={!!pendingCancel}
                title="Cancel invitation"
                description={pendingCancel ? `The invitation for ${pendingCancel.email} will stop working immediately.` : undefined}
                confirmLabel="Cancel invitation"
                cancelLabel="Keep it"
                danger
                loading={cancelMutation.isPending}
                onConfirm={handleCancel}
                onCancel={() => setPendingCancel(null)}
            />

            <InviteLinkDialog
                open={!!linkDialog}
                url={linkDialog?.url ?? null}
                email={linkDialog?.email}
                onClose={() => setLinkDialog(null)}
            />
        </>
    );
}
