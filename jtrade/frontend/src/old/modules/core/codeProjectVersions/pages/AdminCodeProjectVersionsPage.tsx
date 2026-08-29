import * as React from "react";
import { Box, Typography } from "@mui/material";

import CodeProjectVersionsTable from "../components/CodeProjectVersionsTable";

import {
    useCodeProjectVersions,
    useDownloadCodeProjectVersionById,
    useRemoveCodeProjectVersion,
} from "../hooks/useCodeProjectVersions";

import type { CodeProjectVersion } from "../types/codeProjectVersions";

export default function AdminCodeProjectVersionsPage() {
    const qVersions = useCodeProjectVersions({ populate: true });
    const mRemove = useRemoveCodeProjectVersion();
    const mDownload = useDownloadCodeProjectVersionById();

    const rows = qVersions.data ?? [];

    const loading = qVersions.isLoading || mRemove.isPending || mDownload.isPending;

    const refresh = async () => {
        await qVersions.refetch();
    };

    const handleRemove = async (row: CodeProjectVersion) => {
        await mRemove.mutateAsync(row.id);
        await refresh();
    };

    const handleDownload = async (row: CodeProjectVersion) => {
        const result = await mDownload.mutateAsync({
            id: row.id,
            params: {
                expiresInSeconds: 60,
            },
        });

        if (result?.downloadUrl) {
            window.open(result.downloadUrl, "_blank", "noopener,noreferrer");
        }
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
                    Code Project Versions
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    General admin view of all uploaded versions in the marketplace.
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
                <CodeProjectVersionsTable
                    mode="admin"
                    rows={rows}
                    loading={loading}
                    onRefresh={refresh}
                    onRemove={handleRemove}
                    onDownload={handleDownload}
                />
            </Box>
        </Box>
    );
}