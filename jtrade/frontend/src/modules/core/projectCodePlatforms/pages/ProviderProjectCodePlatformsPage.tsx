import * as React from "react";
import {
    Box,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import ProjectCodePlatformForm from "../components/ProjectCodePlatformForm";
import ProjectCodePlatformsTable from "../components/ProjectCodePlatformsTable";

import {
    useCreateMyProjectCodePlatform,
    useMyProjectCodePlatforms,
    useRemoveMyProjectCodePlatform,
    useUpdateMyProjectCodePlatform,
} from "../hooks/useProjectCodePlatforms";

import { useMyCodeProjects } from "@/modules/core/codeProjects/hooks/useCodeProjects";
import { usePlatforms } from "@/modules/core/platforms/hooks/usePlatforms";

import type {
    CreateProjectCodePlatformPayload,
    ProjectCodePlatform,
    UpdateProjectCodePlatformPayload,
} from "../types/projectCodePlatforms";

export default function ProviderProjectCodePlatformsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const qRows = useMyProjectCodePlatforms();
    const qProjects = useMyCodeProjects();
    const qPlatforms = usePlatforms();

    const mCreate = useCreateMyProjectCodePlatform();
    const mUpdate = useUpdateMyProjectCodePlatform();
    const mRemove = useRemoveMyProjectCodePlatform();

    const [editing, setEditing] = React.useState<ProjectCodePlatform | null>(null);
    const [openForm, setOpenForm] = React.useState(false);

    const rows = qRows.data ?? [];
    const codeProjects = qProjects.data ?? [];
    const platforms = qPlatforms.data ?? [];

    const loading =
        qRows.isLoading ||
        qProjects.isLoading ||
        qPlatforms.isLoading ||
        mCreate.isPending ||
        mUpdate.isPending ||
        mRemove.isPending;

    const refresh = async () => {
        await qRows.refetch();
    };

    const handleOpenCreate = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleOpenEdit = (row: ProjectCodePlatform) => {
        setEditing(row);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleCreate = async (
        payload: CreateProjectCodePlatformPayload | UpdateProjectCodePlatformPayload,
    ) => {
        await mCreate.mutateAsync(payload as CreateProjectCodePlatformPayload);
        await refresh();
        handleCloseForm();
    };

    const handleUpdate = async (
        payload: CreateProjectCodePlatformPayload | UpdateProjectCodePlatformPayload,
    ) => {
        if (!editing) return;

        await mUpdate.mutateAsync({
            id: editing.id,
            payload: payload as UpdateProjectCodePlatformPayload,
        });

        await refresh();
        handleCloseForm();
    };

    const handleRemove = async (row: ProjectCodePlatform) => {
        await mRemove.mutateAsync(row.id);

        if (editing?.id === row.id) {
            handleCloseForm();
        }

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
                    Assign your code projects to platforms like MT5, TradingView or other supported integrations.
                </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <ProjectCodePlatformsTable
                    mode="provider"
                    rows={rows}
                    loading={loading}
                    onRefresh={refresh}
                    onCreate={handleOpenCreate}
                    onEdit={handleOpenEdit}
                    onRemove={handleRemove}
                />
            </Box>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={handleCloseForm}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : { md: 640, lg: 720 },
                        maxWidth: "100%",
                        top: isMobile ? "auto" : `${HEADER_HEIGHT}px`,
                        height: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        minHeight: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
                        overflow: "hidden",
                        display: "flex",
                        flexDirection: "column",
                    },
                }}
            >
                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        p: { xs: 1.5, sm: 2, md: 2.5 },
                        WebkitOverflowScrolling: "touch",
                    }}
                >
                    <ProjectCodePlatformForm
                        mode={editing ? "edit" : "create"}
                        loading={loading}
                        initialData={editing}
                        codeProjects={codeProjects}
                        platforms={platforms}
                        onSubmit={editing ? handleUpdate : handleCreate}
                        onCancel={handleCloseForm}
                    />
                </Box>
            </Drawer>
        </Box>
    );
}