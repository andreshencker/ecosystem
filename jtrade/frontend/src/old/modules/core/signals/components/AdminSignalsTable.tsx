import * as React from "react";
import {
    Box,
    Chip,
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
import type { AdminSignal } from "@/old/modules/core/signals/types/signals";

type Props = {
    rows?: AdminSignal[];
    loading?: boolean;
};

function formatDate(value?: string) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
}

export default function AdminSignalsTable({ rows = [], loading }: Props) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const sortedRows = React.useMemo(() => {
        return [...rows].sort((a, b) => {
            const da = new Date(a.createdAt ?? "").getTime();
            const db = new Date(b.createdAt ?? "").getTime();
            return db - da;
        });
    }, [rows]);

    if (isMobile) {
        return (
            <Stack spacing={1.5}>
                {sortedRows.map((row) => (
                    <Paper
                        key={row.signalId}
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            p: 1.5,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                        }}
                    >
                        <Stack spacing={1}>
                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                <Typography variant="body2" fontWeight={900}>
                                    {row.symbol} · {row.timeFrame}
                                </Typography>

                                <Chip
                                    label={row.action}
                                    size="small"
                                    color={row.action === "BUY" ? "success" : "error"}
                                />
                            </Stack>

                            <Stack spacing={0.7}>
                                <Stack direction="row" justifyContent="space-between" spacing={2}>
                                    <Typography variant="caption" color="text.secondary">
                                        Created
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} textAlign="right">
                                        {formatDate(row.createdAt)}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" justifyContent="space-between" spacing={2}>
                                    <Typography variant="caption" color="text.secondary">
                                        Indicator
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} textAlign="right">
                                        {row.indicator?.name ?? "-"}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" justifyContent="space-between" spacing={2}>
                                    <Typography variant="caption" color="text.secondary">
                                        Created by
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} textAlign="right">
                                        {row.createdBy?.name ?? "-"}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" justifyContent="space-between" spacing={2}>
                                    <Typography variant="caption" color="text.secondary">
                                        Status
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700} textAlign="right">
                                        {row.isActive ? "Active" : "Inactive"}
                                    </Typography>
                                </Stack>
                            </Stack>
                        </Stack>
                    </Paper>
                ))}

                {sortedRows.length === 0 && !loading && (
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
                            No signals found.
                        </Typography>
                    </Paper>
                )}
            </Stack>
        );
    }

    if (isTablet) {
        return (
            <Stack spacing={1.5} sx={{ height: "100%", minHeight: 0, overflowY: "auto" }}>
                {sortedRows.map((row) => (
                    <Paper
                        key={row.signalId}
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            p: 2,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: "background.paper",
                        }}
                    >
                        <Stack spacing={1.25}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                spacing={2}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body1" fontWeight={900}>
                                        {row.symbol} · {row.timeFrame}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {row.indicator?.name ?? "-"}
                                    </Typography>
                                </Box>

                                <Chip
                                    label={row.action}
                                    size="small"
                                    color={row.action === "BUY" ? "success" : "error"}
                                />
                            </Stack>

                            <Box
                                sx={{
                                    display: "grid",
                                    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                                    gap: 1.25,
                                }}
                            >
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Created
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                        {formatDate(row.createdAt)}
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Status
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                        {row.isActive ? "Active" : "Inactive"}
                                    </Typography>
                                </Box>

                                <Box sx={{ gridColumn: "1 / -1" }}>
                                    <Typography variant="caption" color="text.secondary">
                                        Created by
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                        {row.createdBy?.name ?? "-"}
                                    </Typography>
                                </Box>
                            </Box>
                        </Stack>
                    </Paper>
                ))}

                {sortedRows.length === 0 && !loading && (
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
                            No signals found.
                        </Typography>
                    </Paper>
                )}
            </Stack>
        );
    }

    return (
        <Paper
            elevation={0}
            sx={{
                height: "100%",
                minHeight: 0,
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                overflow: "hidden",
            }}
        >
            <TableContainer
                sx={{
                    height: "100%",
                    minHeight: 0,
                    overflowY: "auto",
                    overflowX: "auto",
                }}
            >
                <Table
                    size="medium"
                    stickyHeader
                    sx={{
                        minWidth: 980,
                        tableLayout: "fixed",
                    }}
                >
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ width: 190 }}>Created</TableCell>
                            <TableCell sx={{ width: 110 }}>Symbol</TableCell>
                            <TableCell sx={{ width: 110 }}>Timeframe</TableCell>
                            <TableCell sx={{ width: 170 }}>Indicator</TableCell>
                            <TableCell sx={{ width: 110 }}>Action</TableCell>
                            <TableCell sx={{ width: 110 }}>Status</TableCell>
                            <TableCell sx={{ width: 180 }}>Created by</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {sortedRows.map((row) => (
                            <TableRow key={row.signalId} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                        {formatDate(row.createdAt)}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" fontWeight={900} noWrap>
                                        {row.symbol}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" noWrap>
                                        {row.timeFrame}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" noWrap>
                                        {row.indicator?.name ?? "-"}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Chip
                                        label={row.action}
                                        size="small"
                                        color={row.action === "BUY" ? "success" : "error"}
                                    />
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" noWrap>
                                        {row.isActive ? "Active" : "Inactive"}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" noWrap>
                                        {row.createdBy?.name ?? "-"}
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))}

                        {sortedRows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <Box sx={{ py: 4, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No signals found.
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Paper>
    );
}