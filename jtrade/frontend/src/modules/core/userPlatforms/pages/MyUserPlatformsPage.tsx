// src/modules/userPlatforms/pages/MyUserPlatformsPage.tsx
import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Box, Stack, Typography } from "@mui/material";

import UserPlatformsTable from "@/modules/core/userPlatforms/components/UserPlatformsTable";
import PlatformOnboardingSection from "@/modules/core/userPlatforms/components/PlatformOnboardingSection";

import {
    useMyUserPlatforms,
    useSetDefaultMyUserPlatform,
} from "@/modules/core/userPlatforms/hooks/useUserPlatforms";

import { usePlatforms } from "@/modules/core/platforms/hooks/usePlatforms";

export default function MyUserPlatformsPage() {
    const navigate = useNavigate();

    const my = useMyUserPlatforms();
    const platforms = usePlatforms({ supported: true });

    const myRows = my.data ?? [];
    const catalog = platforms.data ?? [];

    const setDefault = useSetDefaultMyUserPlatform();

    const refreshAll = async () => {
        await Promise.all([my.refetch(), platforms.refetch()]);
    };

    const loading = my.isLoading || platforms.isLoading;

    const handleManage = () => {
        navigate("/client/account-info");
    };

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
                        My Platforms
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Review your connected platforms, add supported ones and manage your account setup.
                    </Typography>
                </Box>

                <PlatformOnboardingSection
                    myRows={myRows as any[]}
                    catalog={catalog as any[]}
                    loading={loading}
                    onDone={refreshAll}
                />

                <Box sx={{ minWidth: 0 }}>
                    <UserPlatformsTable
                        rows={myRows as any}
                        loading={loading}
                        onRefresh={refreshAll}
                        onSetDefault={(row) => setDefault.mutate({ id: (row as any).id })}
                        onConnection={(row) => {
                            console.log("Connection row", row);
                        }}
                        onManage={handleManage}
                    />
                </Box>
            </Stack>
        </Box>
    );
}