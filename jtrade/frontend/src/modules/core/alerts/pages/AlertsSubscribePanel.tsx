// FILE: src/modules/alerts/pages/AlertsSubscribePanel.tsx
import * as React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

import AlertsFilters, {
    ALERTS_FILTERS_DEFAULTS,
    type AlertsFiltersValue,
} from "../components/AlertsFilters";

import AlertsSubscribeTable from "../components/AlertsSubscribeTable";

// ✅ Modal del módulo symbolExecution
import SubscribeSymbolExecutionModal from "@/modules/core/symbolExecution/components/SubscribeSymbolExecutionModal";

// ✅ CORRECTO
import { useAlertGroups, useIndicatorsOptions } from "../hooks/useAlerts";

import type { AlertGroupRow } from "../types/alerts";

export default function AlertsSubscribePanel() {
    const { data: indicatorOptions = [], isLoading: indicatorsLoading } =
        useIndicatorsOptions();

    const {
        data: rows = [],
        isLoading,
        refetch,
        isFetching, // ✅ para spinner suave sin "blink"
    } = useAlertGroups();

    const [filters, setFilters] = React.useState<AlertsFiltersValue>(
        ALERTS_FILTERS_DEFAULTS
    );

    const symbolOptions = React.useMemo(() => {
        const set = new Set<string>();
        for (const r of rows as any[]) {
            const s = r?.symbol?.toString()?.trim();
            if (s) set.add(s.toUpperCase());
        }
        return Array.from(set).sort((a, b) => a.localeCompare(b));
    }, [rows]);

    const filteredRows = React.useMemo(() => {
        const sym = (filters.symbol ?? "").trim().toUpperCase();
        const tf = (filters.timeframe ?? "").trim().toUpperCase();
        const ind = (filters.indicatorId ?? "").trim();
        const active = filters.isActive;

        return (rows as any[]).filter((r) => {
            const rSymbol = String(r.symbol ?? "").toUpperCase();
            const rTf = String(r.timeFrame ?? "").toUpperCase();
            const rIndicatorId = String(r.indicator?.id ?? r.indicatorId ?? "");

            if (sym && rSymbol !== sym) return false;
            if (tf && rTf !== tf) return false;
            if (ind && rIndicatorId !== ind) return false;

            if (active === true && r.isActive !== true) return false;
            if (active === false && r.isActive !== false) return false;

            return true;
        });
    }, [rows, filters]);

    const loading = isLoading || indicatorsLoading;

    // modal state
    const [open, setOpen] = React.useState(false);
    const [selected, setSelected] = React.useState<AlertGroupRow | null>(null);

    const handleSubscribe = React.useCallback((row: AlertGroupRow) => {
        setSelected(row);
        setOpen(true);
    }, []);

    const handleClose = React.useCallback(() => {
        setOpen(false);
        setSelected(null);
    }, []);

    const handleSuccess = React.useCallback(async () => {
        // ✅ solo si realmente se creó
        await refetch();
        handleClose();
    }, [refetch, handleClose]);

    return (
        <Box sx={{ maxWidth: 1080, mx: "auto", mt: 3 }}>
            <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>
                Subscribe to Alerts
            </Typography>

            <AlertsFilters
                value={filters}
                onChange={setFilters}
                onClear={() => setFilters(ALERTS_FILTERS_DEFAULTS)}
                indicators={indicatorOptions}
                symbols={symbolOptions}
            />

            {loading ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <AlertsSubscribeTable
                    rows={filteredRows}
                    loading={isFetching} // ✅ mejor UX: muestra loading cuando refetch
                    onSubscribe={handleSubscribe}
                />
            )}

            <SubscribeSymbolExecutionModal
                open={open}
                alertGroup={selected}
                onClose={handleClose}
                onSuccess={handleSuccess} // ✅ NUEVO
            />
        </Box>
    );
}