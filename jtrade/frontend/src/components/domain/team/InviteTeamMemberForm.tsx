import * as React from "react";
import { Box, Button, Divider, MenuItem, Stack, TextField, Typography } from "@mui/material";

import type { InviteTeamMemberPayload } from "@/types/team";

type Props = {
    loading?: boolean;
    onSubmit: (values: InviteTeamMemberPayload) => void | Promise<void>;
    onCancel?: () => void;
};

export default function InviteTeamMemberForm({ loading, onSubmit, onCancel }: Props) {
    const [email, setEmail] = React.useState("");
    const [role, setRole] = React.useState<"admin" | "member">("member");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim()) return;
        await onSubmit({ email: email.trim(), role });
    };

    return (
        <Box component="form" onSubmit={handleSubmit}>
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                        Invite team member
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        They'll receive a Grapifly invitation to join your provider organization.
                    </Typography>
                </Box>

                <Divider />

                <TextField
                    label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                    fullWidth required InputLabelProps={{ shrink: true }}
                />

                <TextField
                    select label="Role" value={role} onChange={(e) => setRole(e.target.value as "admin" | "member")}
                    fullWidth required InputLabelProps={{ shrink: true }}
                    helperText="Admins can manage the organization's team and settings."
                >
                    <MenuItem value="member">Member</MenuItem>
                    <MenuItem value="admin">Admin</MenuItem>
                </TextField>

                <Divider />

                <Stack direction="row" justifyContent={{ xs: "stretch", sm: "flex-end" }} spacing={1.5} flexWrap="wrap" useFlexGap>
                    <Button variant="outlined" color="inherit" onClick={onCancel} disabled={loading} sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 100, sm: 120 } }}>
                        Cancel
                    </Button>
                    <Button type="submit" variant="contained" disabled={loading || !email.trim()}
                        sx={{ textTransform: "none", fontWeight: 800, minWidth: { xs: 120, sm: 140 } }}>
                        Send invite
                    </Button>
                </Stack>
            </Stack>
        </Box>
    );
}
