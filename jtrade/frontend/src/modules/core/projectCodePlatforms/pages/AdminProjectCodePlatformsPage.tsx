import * as React from "react";
import { Box, Typography } from "@mui/material";

import ProjectCodePlatformsTable from "../components/ProjectCodePlatformsTable";

import {
    useDeactivateProjectCodePlatform,
    useProjectCodePlatforms,
} from "../hooks/useProjectCodePlatforms";

import type { ProjectCodePlatform } from "../types/projectCodePlatforms";

export default function AdminProjectCodePlatformsPage() {
    const qRows = useProjectCodePlatforms();
    const mDeactivate = useDeactivateProjectCodePlatform();

    const rows = qRows.data ?? [];
    const loading = qRows.isLoading || mDeactivate.isPending;

    const refresh = async () => {
        await qRows.refetch();
    };

    const handleDeactivate = async (row: ProjectCodePlatform) => {
        await mDeactivate.mutateAsync(row.id);
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
                    Project Platforms
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    General admin view of all project-platform assignments.
                </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <ProjectCodePlatformsTable
                    mode="admin"
                    rows={rows}
                    loading={loading}
                    onRefresh={refresh}
                    onDeactivate={handleDeactivate}
                />
            </Box>
        </Box>
    );
}