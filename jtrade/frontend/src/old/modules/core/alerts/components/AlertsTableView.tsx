import * as React from "react";

import {
    Box,
    Button,
    IconButton,
    Stack,
    Tooltip,
    Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

import AlertsTable, { type AlertsTableMode } from "./AlertsTable";
import AlertsFilters, { type AlertsFiltersValue } from "./AlertsFilters";

import type { AlertGroupRow } from "../types/alerts";

type Props = {
    title?: string;
    subtitle?: string;

    mode: AlertsTableMode;

    rows?: AlertGroupRow[];
    loading?: boolean;

    onRefresh?: () => void;
    onAdd?: () => void;

    filters: AlertsFiltersValue;
    onFiltersChange: (next: AlertsFiltersValue) => void;
    onClearFilters: () => void;

    indicatorOptions?: {
        id: string;
        name: string;
        key?: string;
    }[];

    symbolOptions?: string[];
    timeframeOptions?: string[];

    onEdit?: (row: AlertGroupRow) => void;
    onDelete?: (row: AlertGroupRow) => void;
    onSubscribe?: (row: AlertGroupRow) => void;
};

export default function AlertsTableView({
                                            title = "Alerts",
                                            subtitle = "Manage alerts by indicator, symbol and timeframe.",
                                            mode,
                                            rows = [],
                                            loading,
                                            onRefresh,
                                            onAdd,
                                            filters,
                                            onFiltersChange,
                                            onClearFilters,
                                            indicatorOptions = [],
                                            symbolOptions = [],
                                            timeframeOptions = [],
                                            onEdit,
                                            onDelete,
                                            onSubscribe,
                                        }: Props) {
    return (
        <Box
            sx={{
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            <Box
                sx={{
                    mb: 1.25,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    flexWrap: "wrap",
                    flexShrink: 0,
                }}
            >
                <Box>
                    <Typography variant="h6" fontWeight={800}>
                        {title}
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {subtitle}
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                    {mode === "admin" && onAdd && (
                        <Button
                            variant="contained"
                            startIcon={<AddRoundedIcon />}
                            onClick={onAdd}
                            sx={{
                                textTransform: "none",
                                fontWeight: 800,
                            }}
                        >
                            Add alert
                        </Button>
                    )}

                    <Tooltip title="Reload">
            <span>
              <IconButton
                  size="small"
                  onClick={onRefresh}
                  disabled={loading || !onRefresh}
              >
                <RefreshRoundedIcon
                    fontSize="small"
                    sx={{
                        transform: loading ? "rotate(90deg)" : "none",
                        transition: "transform 0.2s ease-out",
                    }}
                />
              </IconButton>
            </span>
                    </Tooltip>
                </Stack>
            </Box>

            <Box sx={{ flexShrink: 0 }}>
                <AlertsFilters
                    value={filters}
                    indicators={indicatorOptions}
                    symbols={symbolOptions}
                    timeframes={timeframeOptions}
                    onChange={onFiltersChange}
                    onClear={onClearFilters}
                />
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                }}
            >
                <AlertsTable
                    rows={rows}
                    loading={loading}
                    mode={mode}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onSubscribe={onSubscribe}
                />
            </Box>
        </Box>
    );
}