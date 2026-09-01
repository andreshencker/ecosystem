import * as React from "react";
import { Alert, Box, Button, Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";

import type { TeamMember, UpdateTeamMemberPayload } from "@/types/team";

type Props = {
    member: TeamMember;
    loading?: boolean;
    onSubmit: (values: UpdateTeamMemberPayload) => void | Promise<void>;
    onCancel?: () => void;
};

type MemberStatus = "active" | "suspended" | "revoked";

export default function EditTeamMemberForm({ member, loading, onSubmit, onCancel }: Props) {
    const isOwner = member.role === "owner";
    const [role, setRole] = React.useState<"admin" | "member">(member.role === "admin" ? "admin" : "member");
    const [status, setStatus] = React.useState<MemberStatus>(
        (["active", "suspended", "revoked"] as const).includes(member.status as MemberStatus)
            ? (member.status as MemberStatus)
            : "active",
    );

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const patch: UpdateTeamMemberPayload = {};
        if (!isOwner && role !== member.role) patch.role = role;
        if (status !== member.status) patch.status = status;
        if (!patch.role && !patch.status) {
            onCancel?.();
            return;
        }
        await onSubmit(patch);
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        {member.displayName || member.email}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {member.email}
                    </Typography>
                </Box>

                <Divider />

                {isOwner && (
                    <Alert severity="info" variant="outlined">
                        This member owns the organization. Their role and access can only be changed by another owner in Grapifly.
                    </Alert>
                )}

                <TextField
                    select label="Role" value={isOwner ? "owner" : role}
                    onChange={(e) => setRole(e.target.value as "admin" | "member")}
                    fullWidth disabled={isOwner} InputLabelProps={{ shrink: true }}
                    helperText="Admins can manage the organization's team and settings."
                >
                    {isOwner && <MenuItem value="owner">Owner</MenuItem>}
                    <MenuItem value="member">Member</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                </TextField>

                <TextField
                    select label="App access" value={status}
                    onChange={(e) => setStatus(e.target.value as MemberStatus)}
                    fullWidth disabled={isOwner} InputLabelProps={{ shrink: true }}
                    helperText="Suspended members keep their account but lose access to jtrade until reactivated."
                >
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="suspended">Suspended</MenuItem>
                    <MenuItem value="revoked">Revoked</MenuItem>
                </TextField>

                <Divider />

                <Stack direction="row" justifyContent={{ xs: "stretch", sm: "flex-end" }} spacing={1.5} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading}
                        sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 100, sm: 120 } }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading || isOwner}
                        sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 120, sm: 140 } }}>
                        Save changes
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
