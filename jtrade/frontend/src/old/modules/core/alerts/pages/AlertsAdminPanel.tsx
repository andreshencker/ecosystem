import * as React from "react";

import {
    Box,
    CircularProgress,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import AlertForm, {
    type AlertFormValues,
} from "../components/AlertForm";

import AlertsTableView from "../components/AlertsTableView";

import {
    ALERTS_FILTERS_DEFAULTS,
    type AlertsFiltersValue,
} from "../components/AlertsFilters";

import {
    useAlertGroups,
    useCreateAlert,
    useDeleteAlert,
    useIndicatorProjectOptions,
    useUpdateAlert,
    useSymbolOptions,
} from "../hooks/useAlerts";

import type { AlertGroupRow } from "../types/alerts";

function getRowIndicatorId(row: AlertGroupRow) {
    return String(
        row.indicatorProject?.indicator?.id ??
        (row.indicatorProject?.indicator as any)?._id ??
        "",
    );
}

export default function AlertsAdminPanel() {
    const theme = useTheme();

    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    const HEADER_HEIGHT = 56;

    // =========================
    // OPTIONS FOR FORM
    // =========================

    const {
        data: indicatorProjectOptions = [],
        isLoading: indicatorProjectsLoading,
    } = useIndicatorProjectOptions();

    const {
        data: symbolOptions = [],
        isLoading: symbolsLoading,
    } = useSymbolOptions();

    // =========================
    // FILTERS
    // =========================

    const [filters, setFilters] = React.useState<AlertsFiltersValue>(
        ALERTS_FILTERS_DEFAULTS,
    );

    // =========================
    // FORM
    // =========================

    const [editing, setEditing] = React.useState<AlertGroupRow | null>(null);

    const [openForm, setOpenForm] = React.useState(false);

    // =========================
    // QUERY
    // =========================

    const groupsQuery = React.useMemo(() => {
        return {
            isActive:
                filters.isActive === null
                    ? undefined
                    : filters.isActive,
        };
    }, [filters.isActive]);

    const {
        data: rows = [],
        isLoading,
        isFetching,
        refetch,
    } = useAlertGroups(groupsQuery);

    // =========================
    // FILTER OPTIONS FROM ROWS
    // =========================

    const indicatorOptions = React.useMemo(() => {
        const map = new Map<
            string,
            {
                id: string;
                name: string;
                key?: string;
            }
        >();

        for (const row of rows as AlertGroupRow[]) {
            const indicator = row.indicatorProject?.indicator;

            const id = String(
                indicator?.id ??
                (indicator as any)?._id ??
                "",
            );

            if (!id) continue;

            if (!map.has(id)) {
                map.set(id, {
                    id,
                    name:
                        indicator?.name ??
                        indicator?.key ??
                        "Indicator",
                    key: indicator?.key,
                });
            }
        }

        return Array.from(map.values()).sort((a, b) =>
            a.name.localeCompare(b.name),
        );
    }, [rows]);

    const tableSymbolOptions = React.useMemo(() => {
        const indicatorId = filters.indicatorId.trim();
        const set = new Set<string>();

        for (const row of rows as AlertGroupRow[]) {
            const rowIndicatorId = getRowIndicatorId(row);

            if (indicatorId && rowIndicatorId !== indicatorId) {
                continue;
            }

            const symbol = String(row.symbol ?? "")
                .trim()
                .toUpperCase();

            if (symbol) {
                set.add(symbol);
            }
        }

        return Array.from(set).sort((a, b) =>
            a.localeCompare(b),
        );
    }, [rows, filters.indicatorId]);

    const timeframeOptions = React.useMemo(() => {
        const indicatorId = filters.indicatorId.trim();
        const symbol = filters.symbol.trim().toUpperCase();

        const set = new Set<string>();

        for (const row of rows as AlertGroupRow[]) {
            const rowIndicatorId = getRowIndicatorId(row);

            const rowSymbol = String(row.symbol ?? "")
                .trim()
                .toUpperCase();

            if (indicatorId && rowIndicatorId !== indicatorId) {
                continue;
            }

            if (symbol && rowSymbol !== symbol) {
                continue;
            }

            const tf = String(row.timeFrame ?? "")
                .trim()
                .toUpperCase();

            if (tf) {
                set.add(tf);
            }
        }

        return Array.from(set).sort((a, b) =>
            a.localeCompare(b),
        );
    }, [rows, filters.indicatorId, filters.symbol]);

    const filteredRows = React.useMemo(() => {
        const indicatorId = filters.indicatorId.trim();
        const symbol = filters.symbol.trim().toUpperCase();
        const timeframe = filters.timeframe.trim().toUpperCase();

        return (rows ?? []).filter((row: AlertGroupRow) => {
            const rowIndicatorId = getRowIndicatorId(row);

            const rowSymbol = String(row.symbol ?? "")
                .trim()
                .toUpperCase();

            const rowTimeframe = String(row.timeFrame ?? "")
                .trim()
                .toUpperCase();

            if (indicatorId && rowIndicatorId !== indicatorId) {
                return false;
            }

            if (symbol && rowSymbol !== symbol) {
                return false;
            }

            if (timeframe && rowTimeframe !== timeframe) {
                return false;
            }

            return true;
        });
    }, [rows, filters.indicatorId, filters.symbol, filters.timeframe]);

    // =========================
    // MUTATIONS
    // =========================

    const createAlert = useCreateAlert();

    const updateAlert = useUpdateAlert();

    const deleteAlert = useDeleteAlert();

    // =========================
    // ACTIONS
    // =========================

    const handleAdd = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleEdit = (row: AlertGroupRow) => {
        setEditing(row);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleSubmit = async (values: AlertFormValues) => {
        if (editing) {
            const preferredId =
                editing.actions?.find((a) => a.action === "BUY")?.id ??
                editing.actions?.[0]?.id;

            if (!preferredId) {
                return;
            }

            await updateAlert.mutateAsync({
                id: preferredId,
                data: {
                    symbolId: values.symbolId,
                    timeframe: values.timeframe,
                    isActive: values.isActive,
                },
            });

            handleCloseForm();

            await refetch();

            return;
        }

        await createAlert.mutateAsync(values);

        handleCloseForm();

        await refetch();
    };

    const handleDelete = async (row: AlertGroupRow) => {
        const preferredId =
            row.actions?.find((a) => a.action === "BUY")?.id ??
            row.actions?.[0]?.id;

        if (!preferredId) {
            return;
        }

        await deleteAlert.mutateAsync(preferredId);

        if (editing?.groupId === row.groupId) {
            handleCloseForm();
        }

        await refetch();
    };

    // =========================
    // LOADING
    // =========================

    const loading =
        isLoading ||
        indicatorProjectsLoading ||
        symbolsLoading;

    const pending =
        createAlert.isPending ||
        updateAlert.isPending ||
        deleteAlert.isPending;

    if (loading) {
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

    // =========================
    // RENDER
    // =========================

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
            <Box
                sx={{
                    mb: 2.5,
                    flexShrink: 0,
                }}
            >
                <Typography
                    variant="h4"
                    fontWeight={900}
                    sx={{ mb: 0.5 }}
                >
                    Alerts Management
                </Typography>

                <Typography
                    variant="body2"
                    color="text.secondary"
                >
                    Create and manage alert pairs by indicator, symbol and timeframe.
                </Typography>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <AlertsTableView
                    mode="admin"
                    title="Alerts"
                    subtitle="Manage alerts by indicator, symbol and timeframe."
                    rows={filteredRows}
                    loading={isFetching || pending}
                    onRefresh={refetch}
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClearFilters={() =>
                        setFilters(ALERTS_FILTERS_DEFAULTS)
                    }
                    indicatorOptions={indicatorOptions}
                    symbolOptions={tableSymbolOptions}
                    timeframeOptions={timeframeOptions}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onAdd={handleAdd}
                />
            </Box>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={handleCloseForm}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : 620,
                        maxWidth: "100%",
                        top: isMobile ? "auto" : `${HEADER_HEIGHT}px`,
                        height: isMobile
                            ? "92dvh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        minHeight: isMobile ? "70vh" : undefined,
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
                        p: 2.5,
                        overflowY: "auto",
                        overflowX: "hidden",
                        bgcolor: "background.paper",
                    },
                }}
            >
                <AlertForm
                    initial={editing}
                    loading={
                        createAlert.isPending ||
                        updateAlert.isPending
                    }
                    indicatorProjectOptions={indicatorProjectOptions}
                    symbolOptions={symbolOptions}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseForm}
                />
            </Drawer>
        </Box>
    );
}