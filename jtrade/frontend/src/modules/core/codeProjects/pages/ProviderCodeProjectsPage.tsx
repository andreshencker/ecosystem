import * as React from "react";
import {
    Box,
    Drawer,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import CodeProjectForm from "@/modules/core/codeProjects/components/CodeProjectForm";
import CodeProjectsTable from "@/modules/core/codeProjects/components/CodeProjectsTable";

import {
    useCreateMyCodeProject,
    useMyCodeProjects,
    useRemoveMyCodeProject,
    useUpdateMyCodeProject,
} from "@/modules/core/codeProjects/hooks/useCodeProjects";

import { useActiveTypeProjects } from "@/modules/core/typeProjects/hooks/useTypeProjects";

import type {
    CodeProject,
    CreateCodeProjectPayload,
    UpdateCodeProjectPayload,
} from "@/modules/core/codeProjects/types/codeProjects";

export default function ProviderCodeProjectsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const qProjects = useMyCodeProjects();
    const qTypes = useActiveTypeProjects();

    const mCreate = useCreateMyCodeProject();
    const mUpdate = useUpdateMyCodeProject();
    const mRemove = useRemoveMyCodeProject();

    const [editing, setEditing] = React.useState<CodeProject | null>(null);
    const [openForm, setOpenForm] = React.useState(false);

    const rows = qProjects.data ?? [];
    const typeProjects = qTypes.data ?? [];

    const loading =
        qProjects.isLoading ||
        qTypes.isLoading ||
        mCreate.isPending ||
        mUpdate.isPending ||
        mRemove.isPending;

    const refresh = async () => {
        await qProjects.refetch();
    };

    const handleOpenCreate = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleOpenEdit = (row: CodeProject) => {
        setEditing(row);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleCreate = async (
        payload: CreateCodeProjectPayload | UpdateCodeProjectPayload,
    ) => {
        await mCreate.mutateAsync(payload as CreateCodeProjectPayload);
        await refresh();
        handleCloseForm();
    };

    const handleUpdate = async (
        payload: CreateCodeProjectPayload | UpdateCodeProjectPayload,
    ) => {
        if (!editing) return;

        await mUpdate.mutateAsync({
            id: editing.id,
            payload: payload as UpdateCodeProjectPayload,
        });

        await refresh();
        handleCloseForm();
    };

    const handleRemove = async (row: CodeProject) => {
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
                    My Code Projects
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Create and manage the projects published by your provider company.
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
                    <CodeProjectForm
                        mode={editing ? "edit" : "create"}
                        loading={loading}
                        initialData={editing}
                        typeProjects={typeProjects}
                        onSubmit={editing ? handleUpdate : handleCreate}
                        onCancel={handleCloseForm}
                    />
                </Box>
            </Drawer>
        </Box>
    );
}