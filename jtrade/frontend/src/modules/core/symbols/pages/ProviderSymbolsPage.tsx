import * as React from "react";

import {
    Box,
    CircularProgress,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import SymbolForm, {
    type SymbolFormValues,
} from "../components/SymbolForm";

import SymbolsTable from "../components/SymbolsTable";

import {
    useCreateSymbol,
    useDeleteSymbol,
    useSymbols,
    useUpdateSymbol,
    useUpdateSymbolStatus,
} from "../hooks/useSymbols";

import { useMyCompanyProvider } from "@/modules/core/companyProviders/hooks/useCompanyProviders";

import type { SymbolItem } from "../types/symbols";

export default function ProviderSymbolsPage() {
    const theme = useTheme();

    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const HEADER_HEIGHT = 56;

    const qCompany = useMyCompanyProvider();

    const companyProviderId = qCompany.data?.id ?? "";

    const qSymbols = useSymbols(
        companyProviderId
            ? {
                companyProviderId,
            }
            : undefined,
        {
            enabled: !!companyProviderId,
        },
    );

    const mCreate = useCreateSymbol();
    const mUpdate = useUpdateSymbol();
    const mDelete = useDeleteSymbol();
    const mStatus = useUpdateSymbolStatus();

    const [editing, setEditing] =
        React.useState<SymbolItem | null>(null);

    const [openForm, setOpenForm] =
        React.useState(false);

    const rows = qSymbols.data ?? [];

    const loading =
        qCompany.isFetching ||
        qSymbols.isFetching ||
        mCreate.isPending ||
        mUpdate.isPending ||
        mDelete.isPending ||
        mStatus.isPending;

    const refresh = async () => {
        await Promise.all([
            qCompany.refetch(),
            qSymbols.refetch(),
        ]);
    };

    const closeForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleSubmit = async (
        values: SymbolFormValues,
    ) => {
        if (!companyProviderId) return;

        if (editing) {
            await mUpdate.mutateAsync({
                id: editing.id,
                data: {
                    symbol: values.symbol,
                    isActive: values.isActive,
                },
            });
        } else {
            await mCreate.mutateAsync({
                ...values,
                companyProviderId,
            });
        }

        await refresh();

        closeForm();
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

    return (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                px: {
                    xs: 1.5,
                    sm: 2,
                    lg: 3,
                },
                py: {
                    xs: 2,
                    sm: 3,
                },
                boxSizing: "border-box",
            }}
        >
            <Box sx={{ mb: 2.5, flexShrink: 0 }}>
                <Typography variant="h4" fontWeight={900}>
                    Symbols
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Manage the symbol catalog for your provider company.
                </Typography>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <SymbolsTable
                    rows={rows}
                    loading={loading}
                    onRefresh={refresh}
                    onAdd={() => {
                        setEditing(null);
                        setOpenForm(true);
                    }}
                    onEdit={(row) => {
                        setEditing(row);
                        setOpenForm(true);
                    }}
                    onDelete={async (row) => {
                        await mDelete.mutateAsync(row.id);
                        await refresh();
                    }}
                    onToggleActive={async (row, next) => {
                        await mStatus.mutateAsync({
                            id: row.id,
                            isActive: next,
                        });

                        await refresh();
                    }}
                />
            </Box>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={closeForm}
                PaperProps={{
                    sx: {
                        width: isMobile
                            ? "100%"
                            : {
                                md: 560,
                                lg: 640,
                            },

                        maxWidth: "100%",

                        top: isMobile
                            ? "auto"
                            : `${HEADER_HEIGHT}px`,

                        height: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,

                        minHeight: isMobile
                            ? "70vh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,

                        borderTopLeftRadius:
                            isMobile
                                ? 16
                                : 0,

                        borderTopRightRadius:
                            isMobile
                                ? 16
                                : 0,

                        p: {
                            xs: 1.5,
                            sm: 2,
                            md: 2.5,
                        },

                        overflowY: "auto",
                        overflowX: "hidden",
                    },
                }}
            >
                <SymbolForm
                    initial={editing}
                    loading={loading}
                    companyProviderId={companyProviderId}
                    onSubmit={handleSubmit}
                    onCancel={closeForm}
                />
            </Drawer>
        </Box>
    );
}