import * as React from "react";
import {
    Box,
    Button,
    CircularProgress,
    Drawer,
    Stack,
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

import { useMyCompanyProvider } from "@/modules/core/companyProviders/hooks/useCompanyProviders";

import type { Indicator } from "../types/indicators";

export default function ProviderIndicatorsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const qCompany = useMyCompanyProvider();
    const companyProviderId = qCompany.data?.id ?? "";

    const qIndicators = useIndicators(
        companyProviderId ? { companyProviderId } : undefined,
        { enabled: !!companyProviderId },
    );

    const mCreate = useCreateIndicator();
    const mUpdate = useUpdateIndicator();
    const mDelete = useDeleteIndicator();

    const [editing, setEditing] = React.useState<Indicator | null>(null);
    const [openForm, setOpenForm] = React.useState(false);

    const rows = qIndicators.data ?? [];

    const loading =
        qCompany.isFetching ||
        qIndicators.isFetching ||
        mCreate.isPending ||
        mUpdate.isPending ||
        mDelete.isPending;

    const refresh = async () => {
        if (!companyProviderId) {
            await qCompany.refetch();
            return;
        }

        await Promise.all([qCompany.refetch(), qIndicators.refetch()]);
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
        if (!companyProviderId) return;

        if (editing) {
            const { companyProviderId: _ignored, ...data } = values;

            await mUpdate.mutateAsync({
                id: editing.id,
                data,
            });
        } else {
            await mCreate.mutateAsync({
                ...values,
                companyProviderId,
            });
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

    if (qCompany.isFetching && !qCompany.data) {
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

    if (qCompany.isError) {
        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="error" fontWeight={900}>
                    Error loading provider company
                </Typography>
            </Box>
        );
    }

    if (!companyProviderId) {
        return (
            <Box sx={{ p: 3 }}>
                <Stack spacing={1.5}>
                    <Typography variant="h5" fontWeight={900}>
                        Company profile required
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Create your provider company profile before managing indicators.
                    </Typography>

                    <Button
                        variant="contained"
                        onClick={() => qCompany.refetch()}
                        sx={{ width: "fit-content", textTransform: "none", fontWeight: 800 }}
                    >
                        Check again
                    </Button>
                </Stack>
            </Box>
        );
    }

    if (qIndicators.isError) {
        const error: any = qIndicators.error;

        return (
            <Box sx={{ p: 3 }}>
                <Typography variant="h5" color="error" fontWeight={900}>
                    Error loading indicators
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
                    My Indicators
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Manage the indicator catalog for your provider company.
                </Typography>
            </Box>

            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <IndicatorsTable
                    rows={rows}
                    loading={loading}
                    showCompany={false}
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
                    },
                }}
            >
                <IndicatorsForm
                    initial={editing}
                    fixedCompanyProviderId={companyProviderId}
                    loading={loading}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseForm}
                />
            </Drawer>
        </Box>
    );
}