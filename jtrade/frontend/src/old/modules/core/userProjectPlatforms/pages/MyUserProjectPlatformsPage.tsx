import * as React from "react";
import {
    Box,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import UserProjectPlatformForm from "../components/UserProjectPlatformForm";
import UserProjectPlatformsTable from "../components/UserProjectPlatformsTable";

import {
    useCreateMyUserProjectPlatform,
    useMarkMyUserProjectPlatformDownloaded,
    useMyUserProjectPlatforms,
    useRemoveMyUserProjectPlatform,
    useUpdateMyUserProjectPlatform,
} from "../hooks/useUserProjectPlatforms";

import { useAvailableProjectCodePlatforms } from "@/old/modules/core/projectCodePlatforms/hooks/useProjectCodePlatforms";

import { useDownloadCurrentCodeProjectVersion } from "@/old/modules/core/codeProjectVersions/hooks/useCodeProjectVersions";

import type { UserProjectPlatform } from "../types/userProjectPlatforms";
import type { CreateUserProjectPlatformDto } from "../types/userProjectPlatforms";

export default function MyUserProjectPlatformsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const qSubscriptions = useMyUserProjectPlatforms();
    const qProjectPlatforms = useAvailableProjectCodePlatforms();

    const mCreate = useCreateMyUserProjectPlatform();
    const mUpdate = useUpdateMyUserProjectPlatform();
    const mRemove = useRemoveMyUserProjectPlatform();
    const mDownload = useDownloadCurrentCodeProjectVersion();
    const mMarkDownloaded = useMarkMyUserProjectPlatformDownloaded();

    const [openForm, setOpenForm] = React.useState(false);

    const rows = qSubscriptions.data ?? [];
    const projectPlatforms = qProjectPlatforms.data ?? [];

    const loading =
        qSubscriptions.isLoading ||
        qProjectPlatforms.isLoading ||
        qSubscriptions.isFetching ||
        qProjectPlatforms.isFetching ||
        mCreate.isPending ||
        mUpdate.isPending ||
        mRemove.isPending ||
        mDownload.isPending ||
        mMarkDownloaded.isPending;

    const refreshAll = async () => {
        await Promise.all([
            qSubscriptions.refetch(),
            qProjectPlatforms.refetch(),
        ]);
    };

    const handleOpenForm = () => {
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setOpenForm(false);
    };

    const handleSubscribe = async (dto: CreateUserProjectPlatformDto) => {
        await mCreate.mutateAsync(dto);
        await refreshAll();
        handleCloseForm();
    };

    const handleToggleActive = async (
        row: UserProjectPlatform,
        nextActive: boolean,
    ) => {
        await mUpdate.mutateAsync({
            id: row.id,
            dto: {
                isActive: nextActive,
            },
        });

        await qSubscriptions.refetch();
    };

    const handleRemove = async (row: UserProjectPlatform) => {
        await mRemove.mutateAsync(row.id);
        await qSubscriptions.refetch();
    };

    const handleDownload = async (row: UserProjectPlatform) => {
        if (!row.projectCodePlatformId) return;

        const result = await mDownload.mutateAsync({
            projectCodePlatformId: row.projectCodePlatformId,
            params: {
                expiresInSeconds: 60,
            },
        });

        if (!result?.downloadUrl) return;

        window.open(result.downloadUrl, "_blank", "noopener,noreferrer");

        await mMarkDownloaded.mutateAsync(row.id);
        await qSubscriptions.refetch();
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
                    My Projects
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Subscribe to available projects and download the current version.
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
                <UserProjectPlatformsTable
                    mode="client"
                    rows={rows}
                    loading={loading}
                    onRefresh={refreshAll}
                    onCreate={handleOpenForm}
                    onToggleActive={handleToggleActive}
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
                    <UserProjectPlatformForm
                        loading={loading}
                        projectPlatforms={projectPlatforms}
                        onSubmit={handleSubscribe}
                        onCancel={handleCloseForm}
                    />
                </Box>
            </Drawer>
        </Box>
    );
}