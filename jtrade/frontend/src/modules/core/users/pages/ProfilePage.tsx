import * as React from "react";
import { Box, Stack, Typography } from "@mui/material";

import ProfileForm from "../components/ProfileForm";
import { useMe, useUpdateMyProfile } from "../hooks/useUsers";

export default function ProfileScreen() {
    const qMe = useMe();
    const mUpdate = useUpdateMyProfile();

    return (
        <Box
            sx={{
                width: "100%",
                minHeight: "100%",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
                overflowX: "hidden",
            }}
        >
            <Stack spacing={2.5}>
                <Box>
                    <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                        My Profile
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Update your personal information and keep your profile details up to date.
                    </Typography>
                </Box>

                <Box sx={{ width: "100%", minWidth: 0 }}>
                    <ProfileForm
                        me={qMe.data ?? null}
                        loading={mUpdate.isPending}
                        onSubmit={(dto) => mUpdate.mutateAsync(dto)}
                    />
                </Box>
            </Stack>
        </Box>
    );
}