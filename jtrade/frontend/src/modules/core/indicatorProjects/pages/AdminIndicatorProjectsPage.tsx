import * as React from "react";

import {
    Box,
    CircularProgress,
    Typography,
} from "@mui/material";

import IndicatorProjectsTable from "../components/IndicatorProjectsTable";

import {
    useDeactivateIndicatorProject,
    useIndicatorProjects,
} from "../hooks/useIndicatorProjects";

import type { IndicatorProject } from "../types/indicatorProjects";

export default function AdminIndicatorProjectsPage() {
    const qRows = useIndicatorProjects();

    const mDeactivate = useDeactivateIndicatorProject();

    const rows = qRows.data ?? [];

    const loading = qRows.isFetching || mDeactivate.isPending;

    const refresh = async () => {
        await qRows.refetch();
    };

    const handleDelete = async (row: IndicatorProject) => {
        await mDeactivate.mutateAsync(row.id);
        await refresh();
    };

    if (qRows.isLoading) {
        return (
            <Box
                sx={{
                    height: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    if (qRows.isError) {
        const error: any = qRows.error;

        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="error" fontWeight={900}>
                    Error loading indicator projects
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {error?.response?.data?.message ??
                        error?.message ??
                        "Unknown error"}
                </Typography>
            </Box>
        );
    }

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
                <Typography variant="h4" fontWeight={900}>
                    Indicator Projects Management
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Admin view for all indicator projects connected to project platforms.
                </Typography>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <IndicatorProjectsTable
                    rows={rows}
                    loading={loading}
                    showCompany
                    adminMode
                    onRefresh={refresh}
                    onDelete={handleDelete}
                />
            </Box>
        </Box>
    );
}