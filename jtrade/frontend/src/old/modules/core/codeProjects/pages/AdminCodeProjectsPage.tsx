import * as React from "react";
import { Box, Stack, Typography } from "@mui/material";

import CodeProjectsTable from "@/old/modules/core/codeProjects/components/CodeProjectsTable";

import {
    useCodeProjects,
    useDeactivateCodeProject,
} from "@/old/modules/core/codeProjects/hooks/useCodeProjects";

import type { CodeProject } from "@/old/modules/core/codeProjects/types/codeProjects";

export default function AdminCodeProjectsPage() {
    const qProjects = useCodeProjects();
    const mDeactivate = useDeactivateCodeProject();

    const rows = qProjects.data ?? [];

    const loading = qProjects.isLoading || mDeactivate.isPending;

    const refresh = async () => {
        await qProjects.refetch();
    };

    const handleDeactivate = async (row: CodeProject) => {
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
                    Code Projects
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    General admin view of all provider projects in the marketplace.
                </Typography>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <CodeProjectsTable
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