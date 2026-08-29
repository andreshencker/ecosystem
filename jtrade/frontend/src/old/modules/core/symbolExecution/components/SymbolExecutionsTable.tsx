import * as React from "react";

import {
    Box,
    Button,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import StatusChip from "@/old/app/common/components/StatusChip";
import DeleteConfirmButton from "@/old/app/common/components/ConfirmDeleteButton";

export type SymbolExecutionRow = {
    id: string;

    contractSize: number;
    riskPercent: number;
    stopDistancePips?: number;
    returnRatio?: number;

    useStopLoss: boolean;
    useTakeProfit: boolean;
    useTrailingStop: boolean;
    useBreakEven: boolean;

    atrPeriod?: number;
    atrMultiplier?: number;

    closeTradesOnWeekend: boolean;
    isActive: boolean;

    alertGroup?: {
        groupId: string;
        indicatorProjectId?: string;
        symbol: string;
        timeFrame: string;
        isActive: boolean;
        actions?: {
            id: string;
            action: "BUY" | "SELL";
            isActive: boolean;
        }[];
        indicator?: {
            id: string;
            name: string;
            key?: string;
        } | null;
        indicatorProject?: {
            id: string;
            indicator?: {
                id: string;
                name: string;
                key?: string;
                description?: string;
                isActive: boolean;
            } | null;
        } | null;
    } | null;

    userAccountInfo?: {
        accountRef?: string;
        canTrade?: boolean;
        indicatorProject?: {
            indicator?: {
                name?: string;
                key?: string;
            } | null;
        } | null;
        userProjectPlatform?: {
            projectCodePlatform?: {
                platform?: {
                    name?: string;
                    imageUrl?: string;
                } | null;
            } | null;
        } | null;
    } | null;
};

type Props = {
    rows?: SymbolExecutionRow[];
    loading?: boolean;
    onEdit?: (row: SymbolExecutionRow) => void;
    onDelete?: (row: SymbolExecutionRow) => void;
};

function fmtNumber(value: any, digits = 2) {
    const num = typeof value === "number" ? value : Number(value);
    if (!Number.isFinite(num)) return "-";
    return num.toFixed(digits);
}

function getIndicatorName(row: SymbolExecutionRow) {
    return (
        row.alertGroup?.indicatorProject?.indicator?.name ??
        row.alertGroup?.indicatorProject?.indicator?.key ??
        row.alertGroup?.indicator?.name ??
        row.alertGroup?.indicator?.key ??
        row.userAccountInfo?.indicatorProject?.indicator?.name ??
        row.userAccountInfo?.indicatorProject?.indicator?.key ??
        "-"
    );
}

function renderStopLossLabel(row: SymbolExecutionRow) {
    if (!row.useStopLoss) return "Off";
    return `${fmtNumber(row.stopDistancePips, 1)} pips`;
}

function renderTakeProfitLabel(row: SymbolExecutionRow) {
    if (!row.useTakeProfit) return "Off";
    return `R:R ${fmtNumber(row.returnRatio, 2)}`;
}

function renderTrailingLabel(row: SymbolExecutionRow) {
    if (!row.useTrailingStop) return "Off";

    return `ATR ${fmtNumber(row.atrPeriod, 0)} × ${fmtNumber(
        row.atrMultiplier,
        2,
    )}`;
}

function renderBreakEvenLabel(row: SymbolExecutionRow) {
    return row.useBreakEven ? "On" : "Off";
}

function renderWeekendCloseLabel(row: SymbolExecutionRow) {
    return row.closeTradesOnWeekend ? "On" : "Off";
}

export default function SymbolExecutionsTable({
                                                  rows = [],
                                                  loading,
                                                  onEdit,
                                                  onDelete,
                                              }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const renderActions = (row: SymbolExecutionRow) => (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: "stretch", sm: "flex-end" }}
            flexWrap="nowrap"
        >
            <Button
                size="small"
                variant={isDark ? "outlined" : "contained"}
                color="inherit"
                onClick={() => onEdit?.(row)}
                sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    minWidth: 72,
                    px: 1.8,
                    ...(isDark && {
                        borderColor: "divider",
                        bgcolor: "rgba(255,255,255,0.02)",
                    }),
                }}
            >
                Edit
            </Button>

            <DeleteConfirmButton
                label="Delete"
                color="error"
                size="small"
                confirmTitle="Delete subscription"
                confirmText="Are you sure you want to delete this subscription?"
                description="This action cannot be undone."
                onConfirm={() => onDelete?.(row)}
            />
        </Stack>
    );

    if (isMobile) {
        return (
            <Stack spacing={1.5}>
                {rows.map((row) => {
                    const group = row.alertGroup;

                    return (
                        <Paper
                            key={row.id}
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                p: 1.5,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "background.paper",
                            }}
                        >
                            <Stack spacing={1.25}>
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight={900} noWrap>
                                            {group?.symbol ?? "-"} · {group?.timeFrame ?? "-"}
                                        </Typography>

                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {getIndicatorName(row)}
                                        </Typography>
                                    </Box>

                                    <StatusChip
                                        label={row.isActive ? "Active" : "Inactive"}
                                        color={row.isActive ? "success" : "default"}
                                    />
                                </Stack>

                                <Stack spacing={0.7}>
                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" color="text.secondary">
                                            Contract
                                        </Typography>

                                        <Typography variant="body2" fontWeight={700}>
                                            {fmtNumber(row.contractSize, 2)}
                                        </Typography>
                                    </Stack>

                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" color="text.secondary">
                                            Risk %
                                        </Typography>

                                        <Typography variant="body2" fontWeight={700}>
                                            {fmtNumber(row.riskPercent, 2)}%
                                        </Typography>
                                    </Stack>

                                    <Stack direction="row" justifyContent="space-between">
                                        <Typography variant="caption" color="text.secondary">
                                            Take Profit
                                        </Typography>

                                        <Typography variant="body2" fontWeight={700}>
                                            {renderTakeProfitLabel(row)}
                                        </Typography>
                                    </Stack>
                                </Stack>

                                <Box
                                    sx={{
                                        borderRadius: 2,
                                        px: 1.25,
                                        py: 1,
                                        bgcolor: "action.hover",
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ display: "block", mb: 0.75 }}
                                    >
                                        Protection settings
                                    </Typography>

                                    <Stack spacing={0.6}>
                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary">
                                                Stop Loss
                                            </Typography>

                                            <Typography variant="body2" fontWeight={700}>
                                                {renderStopLossLabel(row)}
                                            </Typography>
                                        </Stack>

                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary">
                                                Trailing Stop
                                            </Typography>

                                            <Typography variant="body2" fontWeight={700}>
                                                {renderTrailingLabel(row)}
                                            </Typography>
                                        </Stack>

                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary">
                                                Break Even
                                            </Typography>

                                            <Typography variant="body2" fontWeight={700}>
                                                {renderBreakEvenLabel(row)}
                                            </Typography>
                                        </Stack>

                                        <Stack direction="row" justifyContent="space-between">
                                            <Typography variant="caption" color="text.secondary">
                                                Weekend Close
                                            </Typography>

                                            <Typography variant="body2" fontWeight={700}>
                                                {renderWeekendCloseLabel(row)}
                                            </Typography>
                                        </Stack>
                                    </Stack>
                                </Box>

                                <Box sx={{ pt: 0.5 }}>{renderActions(row)}</Box>
                            </Stack>
                        </Paper>
                    );
                })}

                {rows.length === 0 && !loading && (
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            p: 2,
                            border: "1px dashed",
                            borderColor: "divider",
                            textAlign: "center",
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            No subscriptions found.
                        </Typography>
                    </Paper>
                )}
            </Stack>
        );
    }

    if (isTablet) {
        return (
            <Stack spacing={1.5}>
                {rows.map((row) => {
                    const group = row.alertGroup;

                    return (
                        <Paper
                            key={row.id}
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                p: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: "background.paper",
                            }}
                        >
                            <Stack spacing={1.5}>
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="flex-start"
                                    spacing={2}
                                >
                                    <Box sx={{ minWidth: 0 }}>
                                        <Typography variant="body1" fontWeight={900}>
                                            {group?.symbol ?? "-"} · {group?.timeFrame ?? "-"}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">
                                            {getIndicatorName(row)}
                                        </Typography>
                                    </Box>

                                    <StatusChip
                                        label={row.isActive ? "Active" : "Inactive"}
                                        color={row.isActive ? "success" : "default"}
                                    />
                                </Stack>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                                        gap: 1.25,
                                    }}
                                >
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Contract
                                        </Typography>

                                        <Typography variant="body2" fontWeight={700}>
                                            {fmtNumber(row.contractSize, 2)}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Risk %
                                        </Typography>

                                        <Typography variant="body2" fontWeight={700}>
                                            {fmtNumber(row.riskPercent, 2)}%
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Take Profit
                                        </Typography>

                                        <Typography variant="body2" fontWeight={700}>
                                            {renderTakeProfitLabel(row)}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box
                                    sx={{
                                        display: "grid",
                                        gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
                                        gap: 1.25,
                                    }}
                                >
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Stop Loss
                                        </Typography>

                                        <Typography variant="body2" fontWeight={700}>
                                            {renderStopLossLabel(row)}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Trailing Stop
                                        </Typography>

                                        <Typography variant="body2" fontWeight={700}>
                                            {renderTrailingLabel(row)}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Break Even
                                        </Typography>

                                        <Typography variant="body2" fontWeight={700}>
                                            {renderBreakEvenLabel(row)}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Weekend Close
                                        </Typography>

                                        <Typography variant="body2" fontWeight={700}>
                                            {renderWeekendCloseLabel(row)}
                                        </Typography>
                                    </Box>
                                </Box>

                                <Box>{renderActions(row)}</Box>
                            </Stack>
                        </Paper>
                    );
                })}

                {rows.length === 0 && !loading && (
                    <Paper
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            p: 2,
                            border: "1px dashed",
                            borderColor: "divider",
                            textAlign: "center",
                        }}
                    >
                        <Typography variant="body2" color="text.secondary">
                            No subscriptions found.
                        </Typography>
                    </Paper>
                )}
            </Stack>
        );
    }

    return (
        <TableContainer
            component={Paper}
            sx={{
                borderRadius: 3,
                boxShadow: "none",
                overflowX: "auto",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
            }}
        >
            <Table size="medium" sx={{ minWidth: 1500 }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ minWidth: 140 }}>Symbol</TableCell>
                        <TableCell sx={{ minWidth: 110 }}>Timeframe</TableCell>
                        <TableCell sx={{ minWidth: 150 }}>Indicator</TableCell>
                        <TableCell align="right" sx={{ minWidth: 110 }}>
                            Contract
                        </TableCell>
                        <TableCell align="right" sx={{ minWidth: 100 }}>
                            Risk %
                        </TableCell>
                        <TableCell align="right" sx={{ minWidth: 140 }}>
                            Take Profit
                        </TableCell>
                        <TableCell sx={{ minWidth: 160 }}>Stop Loss</TableCell>
                        <TableCell sx={{ minWidth: 190 }}>Trailing Stop</TableCell>
                        <TableCell sx={{ minWidth: 130 }}>Break Even</TableCell>
                        <TableCell sx={{ minWidth: 130 }}>Weekend Close</TableCell>
                        <TableCell sx={{ minWidth: 110 }}>Status</TableCell>
                        <TableCell align="center" sx={{ minWidth: 170 }}>
                            Actions
                        </TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {rows.map((row) => {
                        const group = row.alertGroup;

                        return (
                            <TableRow
                                key={row.id}
                                hover
                                sx={{
                                    "&:last-of-type td, &:last-of-type th": {
                                        borderBottom: 0,
                                    },
                                }}
                            >
                                <TableCell>
                                    <Typography variant="body2" fontWeight={900} noWrap>
                                        {group?.symbol ?? "-"}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" noWrap>
                                        {group?.timeFrame ?? "-"}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" noWrap>
                                        {getIndicatorName(row)}
                                    </Typography>
                                </TableCell>

                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight={700}>
                                        {fmtNumber(row.contractSize, 2)}
                                    </Typography>
                                </TableCell>

                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight={700}>
                                        {fmtNumber(row.riskPercent, 2)}%
                                    </Typography>
                                </TableCell>

                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight={700}>
                                        {renderTakeProfitLabel(row)}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" fontWeight={700}>
                                        {renderStopLossLabel(row)}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" fontWeight={700}>
                                        {renderTrailingLabel(row)}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" fontWeight={700}>
                                        {renderBreakEvenLabel(row)}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" fontWeight={700}>
                                        {renderWeekendCloseLabel(row)}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <StatusChip
                                        label={row.isActive ? "Active" : "Inactive"}
                                        color={row.isActive ? "success" : "default"}
                                    />
                                </TableCell>

                                <TableCell align="center">{renderActions(row)}</TableCell>
                            </TableRow>
                        );
                    })}

                    {rows.length === 0 && !loading && (
                        <TableRow>
                            <TableCell colSpan={12}>
                                <Box sx={{ py: 4, textAlign: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No subscriptions found.
                                    </Typography>
                                </Box>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </TableContainer>
    );
}