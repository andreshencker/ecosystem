import * as React from "react";
import {
    Box,
    CircularProgress,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import PlatformsTable from "../components/PlatformsTable";
import PlatformForm, { PlatformFormValues } from "../components/PlatformForm";
import type { Platform } from "../types/platforms";

import {
    useCreatePlatform,
    useDeletePlatform,
    usePlatforms,
    useUpdatePlatform,
} from "@/modules/core/platforms/hooks/usePlatforms";

export default function PlatformsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const q = usePlatforms();
    const platforms = q.data ?? [];
    const isLoading = q.isFetching && platforms.length === 0;

    const createPlatform = useCreatePlatform();
    const updatePlatform = useUpdatePlatform();
    const deletePlatform = useDeletePlatform();

    const [editing, setEditing] = React.useState<Platform | null>(null);
    const [openForm, setOpenForm] = React.useState(false);

    React.useEffect(() => {
        Promise.resolve().then(() => q.refetch());
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const pending =
        createPlatform.isPending ||
        updatePlatform.isPending ||
        deletePlatform.isPending;

    const handleAdd = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleEdit = (row: Platform) => {
        setEditing(row);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleSubmit = async (values: PlatformFormValues) => {
        if (editing) {
            await updatePlatform.mutateAsync({ id: editing.id, data: values });
            handleCloseForm();
            await q.refetch();
            return;
        }

        await createPlatform.mutateAsync(values);
        handleCloseForm();
        await q.refetch();
    };

    const handleDelete = async (row: Platform) => {
        await deletePlatform.mutateAsync(row.id);

        if (editing?.id === row.id) {
            handleCloseForm();
        }

        await q.refetch();
    };

    if (isLoading) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 0,
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
                    Platform Management
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Create and manage platform catalog records, connection types and availability.
                </Typography>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <PlatformsTable
                    rows={platforms}
                    loading={q.isFetching || pending}
                    onRefresh={() => q.refetch()}
                    onAdd={handleAdd}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                />
            </Box>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={handleCloseForm}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : { md: 620, lg: 720 },
                        maxWidth: "100%",
                        top: isMobile ? "auto" : `${HEADER_HEIGHT}px`,
                        height: isMobile ? "auto" : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        minHeight: isMobile ? "70vh" : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
                        p: { xs: 1.5, sm: 2, md: 2.5 },
                        overflowY: "auto",
                        overflowX: "hidden",
                    },
                }}
            >
                <PlatformForm
                    initial={editing}
                    loading={createPlatform.isPending || updatePlatform.isPending}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseForm}
                />
            </Drawer>
        </Box>
    );
}