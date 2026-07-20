import * as React from "react";
import { Box, Typography } from "@mui/material";

import UserProjectPlatformsTable from "../components/UserProjectPlatformsTable";

import {
    useAdminRemoveUserProjectPlatform,
    useAdminUpdateUserProjectPlatform,
    useUserProjectPlatforms,
} from "../hooks/useUserProjectPlatforms";

import type { UserProjectPlatform } from "../types/userProjectPlatforms";

export default function AdminUserProjectPlatformsPage() {
    const qSubscriptions = useUserProjectPlatforms();
    const mUpdate = useAdminUpdateUserProjectPlatform();
    const mRemove = useAdminRemoveUserProjectPlatform();

    const rows = qSubscriptions.data ?? [];
    const loading = qSubscriptions.isLoading || mUpdate.isPending || mRemove.isPending;

    const refresh = async () => {
        await qSubscriptions.refetch();
    };

    const handleRemove = async (row: UserProjectPlatform) => {
        await mRemove.mutateAsync(row.id);
        await refresh();
    };

    return (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
            }}
        >
            <Box sx={{ mb: 2.5, flexShrink: 0 }}>
                <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                    User Project Subscriptions
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Review all client subscriptions to provider projects.
                </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <UserProjectPlatformsTable
                    mode="admin"
                    rows={rows}
                    loading={loading}
                    onRefresh={refresh}
                    onRemove={handleRemove}
                />
            </Box>
        </Box>
    );
}