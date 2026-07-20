import * as React from "react";

import {
    Box,
    Button,
    IconButton,
    Paper,
    Stack,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Tooltip,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import ContentCopyIcon from "@mui/icons-material/ContentCopy";

import StatusChip from "@/app/common/components/StatusChip";
import DeleteConfirmButton from "@/app/common/components/ConfirmDeleteButton";

import type { AlertGroupRow } from "../types/alerts";

export type AlertsTableMode = "admin" | "subscribe";

type Props = {
    rows?: AlertGroupRow[];
    loading?: boolean;
    mode: AlertsTableMode;
    onEdit?: (row: AlertGroupRow) => void;
    onDelete?: (row: AlertGroupRow) => void;
    onSubscribe?: (row: AlertGroupRow) => void;
};

function copyToClipboard(text: string) {
    if (!text) return;

    if (navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(text).catch(() => {});
        return;
    }

    try {
        const el = document.createElement("textarea");
        el.value = text;
        el.style.position = "fixed";
        el.style.opacity = "0";
        document.body.appendChild(el);
        el.focus();
        el.select();
        document.execCommand("copy");
        document.body.removeChild(el);
    } catch {
        // ignore
    }
}

function IdCell({ id }: { id?: string }) {
    if (!id) {
        return (
            <Typography variant="body2" color="text.secondary">
                -
            </Typography>
        );
    }

    return (
        <Stack
            direction="row"
            spacing={0.75}
            alignItems="center"
            sx={{
                minWidth: 0,
                maxWidth: "100%",
            }}
        >
            <Typography
                sx={{
                    fontFamily:
                        "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
                    fontSize: 12.5,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    maxWidth: {
                        xs: 220,
                        sm: 360,
                        md: 260,
                        lg: 300,
                    },
                }}
                title={id}
            >
                {id}
            </Typography>

            <Tooltip title="Copy">
                <IconButton
                    size="small"
                    onClick={() => copyToClipboard(id)}
                    sx={{
                        width: 28,
                        height: 28,
                        flexShrink: 0,
                    }}
                >
                    <ContentCopyIcon fontSize="inherit" />
                </IconButton>
            </Tooltip>
        </Stack>
    );
}

function getIndicatorName(row: AlertGroupRow) {
    return (
        row.indicatorProject?.indicator?.key ??
        row.indicatorProject?.indicator?.name ??
        "-"
    );
}

function getProjectName(row: AlertGroupRow) {
    return row.indicatorProject?.projectCodePlatform?.codeProject?.name ?? "-";
}

function getPlatformName(row: AlertGroupRow) {
    return row.indicatorProject?.projectCodePlatform?.platform?.name ?? "-";
}

function getRuntimeMode(row: AlertGroupRow) {
    return row.indicatorProject?.projectCodePlatform?.runtimeMode ?? "-";
}

function ProjectPlatformText({ row }: { row: AlertGroupRow }) {
    return (
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={900} noWrap>
                {getProjectName(row)}
            </Typography>

            <Typography variant="caption" color="text.secondary" noWrap>
                {getPlatformName(row)} · {getRuntimeMode(row)}
            </Typography>
        </Box>
    );
}

export default function AlertsTable({
                                        rows = [],
                                        loading,
                                        mode,
                                        onEdit,
                                        onDelete,
                                        onSubscribe,
                                    }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const renderActions = (row: AlertGroupRow) => {
        if (mode === "subscribe") {
            return (
                <Button
                    size="small"
                    variant="contained"
                    onClick={() => onSubscribe?.(row)}
                    sx={{
                        textTransform: "none",
                        fontWeight: 800,
                        borderRadius: 3,
                    }}
                >
                    Subscribe
                </Button>
            );
        }

        return (
            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="flex-end"
            >
                <Button
                    size="small"
                    variant={isDark ? "outlined" : "contained"}
                    color="inherit"
                    onClick={() => onEdit?.(row)}
                    sx={{
                        textTransform: "none",
                        fontWeight: 800,
                        borderRadius: 3,
                        px: 1.8,
                        minWidth: 64,
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
                    confirmTitle="Delete alert pair"
                    confirmText="Are you sure you want to delete this alert pair (BUY + SELL)?"
                    description="This action cannot be undone."
                    onConfirm={() => onDelete?.(row)}
                />
            </Stack>
        );
    };

    if (isMobile) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                    pr: 0.5,
                    pb: 1,
                }}
            >
                <Stack spacing={1.5}>
                    {rows.map((row) => {
                        const buy = row.actions?.find(
                            (a: any) => a.action === "BUY",
                        );

                        const sell = row.actions?.find(
                            (a: any) => a.action === "SELL",
                        );

                        return (
                            <Paper
                                key={row.groupId}
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    p: 1.5,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "background.paper",
                                }}
                            >
                                <Stack spacing={1.4}>
                                    <Stack
                                        direction="row"
                                        alignItems="flex-start"
                                        justifyContent="space-between"
                                        spacing={1.5}
                                    >
                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography
                                                variant="body2"
                                                fontWeight={900}
                                                noWrap
                                            >
                                                {row.symbol} · {row.timeFrame}
                                            </Typography>

                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                                noWrap
                                            >
                                                {getIndicatorName(row)}
                                            </Typography>
                                        </Box>

                                        <StatusChip
                                            label={
                                                row.isActive
                                                    ? "Active"
                                                    : "Inactive"
                                            }
                                            color={
                                                row.isActive
                                                    ? "success"
                                                    : "default"
                                            }
                                        />
                                    </Stack>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Project / Platform
                                        </Typography>

                                        <ProjectPlatformText row={row} />
                                    </Box>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            BUY ID
                                        </Typography>

                                        <IdCell id={buy?.id} />
                                    </Box>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            SELL ID
                                        </Typography>

                                        <IdCell id={sell?.id} />
                                    </Box>

                                    <Stack
                                        direction="row"
                                        justifyContent="flex-end"
                                    >
                                        {renderActions(row)}
                                    </Stack>
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
                                No alerts found.
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            </Box>
        );
    }

    if (isTablet) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "hidden",
                    pr: 0.5,
                    pb: 1,
                }}
            >
                <Stack spacing={1.5}>
                    {rows.map((row) => {
                        const buy = row.actions?.find(
                            (a: any) => a.action === "BUY",
                        );

                        const sell = row.actions?.find(
                            (a: any) => a.action === "SELL",
                        );

                        return (
                            <Paper
                                key={row.groupId}
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    p: 2,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "background.paper",
                                }}
                            >
                                <Stack spacing={1.4}>
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="flex-start"
                                        spacing={2}
                                    >
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography
                                                variant="body1"
                                                fontWeight={900}
                                                noWrap
                                            >
                                                {row.symbol} · {row.timeFrame}
                                            </Typography>

                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                noWrap
                                            >
                                                {getIndicatorName(row)}
                                            </Typography>
                                        </Box>

                                        <StatusChip
                                            label={
                                                row.isActive
                                                    ? "Active"
                                                    : "Inactive"
                                            }
                                            color={
                                                row.isActive
                                                    ? "success"
                                                    : "default"
                                            }
                                        />
                                    </Stack>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            Project / Platform
                                        </Typography>

                                        <ProjectPlatformText row={row} />
                                    </Box>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            BUY ID
                                        </Typography>

                                        <IdCell id={buy?.id} />
                                    </Box>

                                    <Box>
                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                        >
                                            SELL ID
                                        </Typography>

                                        <IdCell id={sell?.id} />
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
                                No alerts found.
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            </Box>
        );
    }

    return (
        <TableContainer
            component={Paper}
            sx={{
                height: "100%",
                minHeight: 0,
                maxHeight: "100%",
                borderRadius: 5,
                overflowX: "auto",
                overflowY: "auto",
                boxShadow: "none",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
            }}
        >
            <Table
                size="medium"
                stickyHeader
                sx={{
                    minWidth: 1320,
                    tableLayout: "fixed",
                    "& .MuiTableCell-root": {
                        py: 1.7,
                        borderColor: "divider",
                    },
                    "& .MuiTableHead-root .MuiTableCell-root": {
                        fontWeight: 900,
                        bgcolor: "background.paper",
                    },
                }}
            >
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: 140 }}>Symbol</TableCell>
                        <TableCell sx={{ width: 110 }}>Timeframe</TableCell>
                        <TableCell sx={{ width: 260 }}>
                            Project / Platform
                        </TableCell>
                        <TableCell sx={{ width: 180 }}>Indicator</TableCell>
                        <TableCell sx={{ width: 260 }}>BUY ID</TableCell>
                        <TableCell sx={{ width: 260 }}>SELL ID</TableCell>
                        <TableCell sx={{ width: 130 }}>Status</TableCell>
                        <TableCell sx={{ width: 180 }} align="center">
                            Actions
                        </TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {rows.map((row) => {
                        const buy = row.actions?.find(
                            (a: any) => a.action === "BUY",
                        );

                        const sell = row.actions?.find(
                            (a: any) => a.action === "SELL",
                        );

                        return (
                            <TableRow key={row.groupId} hover>
                                <TableCell>
                                    <Typography
                                        variant="body2"
                                        fontWeight={900}
                                        noWrap
                                    >
                                        {row.symbol}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        noWrap
                                    >
                                        {row.timeFrame}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <ProjectPlatformText row={row} />
                                </TableCell>

                                <TableCell>
                                    <Typography
                                        variant="body2"
                                        fontWeight={800}
                                        noWrap
                                    >
                                        {getIndicatorName(row)}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <IdCell id={buy?.id} />
                                </TableCell>

                                <TableCell>
                                    <IdCell id={sell?.id} />
                                </TableCell>

                                <TableCell>
                                    <StatusChip
                                        label={
                                            row.isActive
                                                ? "Active"
                                                : "Inactive"
                                        }
                                        color={
                                            row.isActive
                                                ? "success"
                                                : "default"
                                        }
                                    />
                                </TableCell>

                                <TableCell align="center">
                                    {renderActions(row)}
                                </TableCell>
                            </TableRow>
                        );
                    })}

                    {rows.length === 0 && !loading && (
                        <TableRow>
                            <TableCell colSpan={8}>
                                <Box sx={{ py: 4, textAlign: "center" }}>
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                    >
                                        No alerts found.
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