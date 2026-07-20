import * as React from "react";
import {
    Box,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import CodeProjectVersionForm, {
    type EditSubmitPayload,
} from "../components/CodeProjectVersionForm";
import CodeProjectVersionsTable from "../components/CodeProjectVersionsTable";

import {
    useDownloadCodeProjectVersionById,
    useMyCodeProjectVersions,
    useRemoveMyCodeProjectVersion,
    useReplaceMyCodeProjectVersionFile,
    useUpdateMyCodeProjectVersion,
    useUploadMyCodeProjectVersion,
} from "../hooks/useCodeProjectVersions";

import { useMyProjectCodePlatforms } from "@/modules/core/projectCodePlatforms/hooks/useProjectCodePlatforms";

import type {
    CodeProjectVersion,
    CreateCodeProjectVersionPayload,
    ReplaceCodeProjectVersionFilePayload,
    UpdateCodeProjectVersionPayload,
} from "../types/codeProjectVersions";

export default function ProviderCodeProjectVersionsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const qVersions = useMyCodeProjectVersions();
    const qProjectPlatforms = useMyProjectCodePlatforms();

    const mUpload = useUploadMyCodeProjectVersion();
    const mUpdate = useUpdateMyCodeProjectVersion();
    const mReplaceFile = useReplaceMyCodeProjectVersionFile();
    const mRemove = useRemoveMyCodeProjectVersion();
    const mDownload = useDownloadCodeProjectVersionById();

    const [openForm, setOpenForm] = React.useState(false);
    const [editing, setEditing] = React.useState<CodeProjectVersion | null>(null);

    const rows = qVersions.data ?? [];
    const projectPlatforms = qProjectPlatforms.data ?? [];

    const loading =
        qVersions.isLoading ||
        qProjectPlatforms.isLoading ||
        mUpload.isPending ||
        mUpdate.isPending ||
        mReplaceFile.isPending ||
        mRemove.isPending ||
        mDownload.isPending;

    const refreshAll = async () => {
        await Promise.all([qVersions.refetch(), qProjectPlatforms.refetch()]);
    };

    const handleOpenCreate = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleEdit = (row: CodeProjectVersion) => {
        setEditing(row);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleUpload = async (
        file: File,
        payload: CreateCodeProjectVersionPayload,
    ) => {
        await mUpload.mutateAsync({
            file,
            payload,
        });

        await refreshAll();
        handleCloseForm();
    };

    const handleUpdateMetadata = async (payload: EditSubmitPayload) => {
        if (!editing) return;

        const { file, ...rest } = payload;

        if (file) {
            await mReplaceFile.mutateAsync({
                id: editing.id,
                file,
                payload: rest as ReplaceCodeProjectVersionFilePayload,
            });
        } else {
            await mUpdate.mutateAsync({
                id: editing.id,
                payload: rest as UpdateCodeProjectVersionPayload,
            });
        }

        await refreshAll();
        handleCloseForm();
    };

    const handleToggleActive = async (
        row: CodeProjectVersion,
        nextActive: boolean,
    ) => {
        await mUpdate.mutateAsync({
            id: row.id,
            payload: {
                isActive: nextActive,
            },
        });

        await refreshAll();
    };

    const handleSetCurrent = async (row: CodeProjectVersion) => {
        await mUpdate.mutateAsync({
            id: row.id,
            payload: {
                isCurrentVersion: true,
            },
        });

        await refreshAll();
    };

    const handleRemove = async (row: CodeProjectVersion) => {
        await mRemove.mutateAsync(row.id);

        if (editing?.id === row.id) {
            handleCloseForm();
        }

        await refreshAll();
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
                    Code Versions
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Upload and manage version files for your project-platform assignments.
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
                    mode="provider"
                    rows={rows}
                    loading={loading}
                    onRefresh={refreshAll}
                    onCreate={handleOpenCreate}
                    onEdit={handleEdit}
                    onToggleActive={handleToggleActive}
                    onSetCurrent={handleSetCurrent}
                    onRemove={handleRemove}
                    onDownload={handleDownload}
                />
            </Box>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={handleCloseForm}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : { md: 660, lg: 760 },
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
                    <CodeProjectVersionForm
                        mode={editing ? "edit" : "create"}
                        initialData={editing}
                        projectPlatforms={projectPlatforms}
                        loading={loading}
                        onSubmit={editing ? handleUpdateMetadata : handleUpload}
                        onCancel={handleCloseForm}
                    />
                </Box>
            </Drawer>
        </Box>
    );
}