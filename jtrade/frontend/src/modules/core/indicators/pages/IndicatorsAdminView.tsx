import * as React from "react";
import {
    Box,
    CircularProgress,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import IndicatorsForm, {
    IndicatorFormValues,
} from "../components/IndicatorsForm";
import IndicatorsTable from "../components/IndicatorsTable";

import {
    useCreateIndicator,
    useDeleteIndicator,
    useIndicators,
    useUpdateIndicator,
} from "../hooks/useIndicators";

import { useCompanyProviders } from "@/modules/core/companyProviders/hooks/useCompanyProviders";

import type { Indicator } from "../types/indicators";

export default function IndicatorsAdminView() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const qIndicators = useIndicators();
    const qCompanies = useCompanyProviders();

    const mCreate = useCreateIndicator();
    const mUpdate = useUpdateIndicator();
    const mDelete = useDeleteIndicator();

    const [editing, setEditing] = React.useState<Indicator | null>(null);
    const [openForm, setOpenForm] = React.useState(false);

    const rows = qIndicators.data ?? [];
    const companies = qCompanies.data ?? [];

    const loading =
        qIndicators.isFetching ||
        qCompanies.isFetching ||
        mCreate.isPending ||
        mUpdate.isPending ||
        mDelete.isPending;

    const refresh = async () => {
        await Promise.all([qIndicators.refetch(), qCompanies.refetch()]);
    };

    const handleAdd = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleEdit = (row: Indicator) => {
        setEditing(row);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleSubmit = async (values: IndicatorFormValues) => {
        if (editing) {
            const { companyProviderId: _ignored, ...data } = values;

            await mUpdate.mutateAsync({
                id: editing.id,
                data,
            });
        } else {
            await mCreate.mutateAsync(values);
        }

        await refresh();
        handleCloseForm();
    };

    const handleDelete = async (row: Indicator) => {
        await mDelete.mutateAsync(row.id);

        if (editing?.id === row.id) {
            handleCloseForm();
        }

        await refresh();
    };

    if (qIndicators.isFetching && !qIndicators.data) {
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
                    Indicators Management
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Admin view for all provider indicator catalogs.
                </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <IndicatorsTable
                    rows={rows}
                    loading={loading}
                    showCompany
                    onRefresh={refresh}
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
                        height: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        minHeight: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
                        p: { xs: 1.5, sm: 2, md: 2.5 },
                        overflowY: "auto",
                        overflowX: "hidden",
                    },
                }}
            >
                <IndicatorsForm
                    initial={editing}
                    companyProviders={companies}
                    loading={loading}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseForm}
                />
            </Drawer>
        </Box>
    );
}