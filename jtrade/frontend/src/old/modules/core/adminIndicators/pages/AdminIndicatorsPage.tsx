import * as React from "react";

import {
    Box,
    CircularProgress,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import AdminIndicatorForm from "../components/AdminIndicatorForm";
import AdminIndicatorsTable from "../components/AdminIndicatorsTable";

import {
    useAdminIndicators,
    useCreateAdminIndicator,
    useDeleteAdminIndicator,
    useUpdateAdminIndicator,
} from "../hooks/useAdminIndicators";

import type {
    AdminIndicator,
    CreateAdminIndicatorPayload,
} from "../types/adminIndicators";

export default function AdminIndicatorsPage() {
    const theme = useTheme();

    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const HEADER_HEIGHT = 56;

    const q = useAdminIndicators();

    const mCreate = useCreateAdminIndicator();

    const mUpdate = useUpdateAdminIndicator();

    const mDelete = useDeleteAdminIndicator();

    const rows = Array.isArray(q.data) ? q.data : [];

    const [openForm, setOpenForm] = React.useState(false);

    const pending =
        mCreate.isPending ||
        mUpdate.isPending ||
        mDelete.isPending;

    const handleClose = () => {
        setOpenForm(false);
    };

    const handleCreate = async (values: CreateAdminIndicatorPayload) => {
        await mCreate.mutateAsync(values);

        handleClose();

        await q.refetch();
    };

    const handleToggleActive = async (
        row: AdminIndicator,
        next: boolean,
    ) => {
        await mUpdate.mutateAsync({
            id: row.id,
            data: {
                isActive: next,
            },
        });

        await q.refetch();
    };

    const handleDelete = async (row: AdminIndicator) => {
        await mDelete.mutateAsync(row.id);

        await q.refetch();
    };

    if (q.isLoading) {
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

    return (
        <Box
            sx={{
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
                    Webhooks
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Manage webhook credentials per indicator project.
                </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0 }}>
                <AdminIndicatorsTable
                    rows={rows}
                    loading={q.isFetching || pending}
                    onRefresh={q.refetch}
                    onAdd={() => setOpenForm(true)}
                    onToggleActive={handleToggleActive}
                    onDelete={handleDelete}
                />
            </Box>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={handleClose}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : 600,
                        maxWidth: "100%",
                        top: isMobile ? "auto" : `${HEADER_HEIGHT}px`,
                        height: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        minHeight: isMobile
                            ? "70vh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
                        p: 2.5,
                        overflowY: "auto",
                    },
                }}
            >
                <AdminIndicatorForm
                    loading={pending}
                    onSubmit={handleCreate}
                    onCancel={handleClose}
                />
            </Drawer>
        </Box>
    );
}