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
import type { ClientSignal } from "@/old/modules/core/signals/types/signals";

type Props = {
    rows?: ClientSignal[];
    loading?: boolean;
};

function formatDate(value?: string) {
    if (!value) return "-";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleString();
}

export default function ClientSignalsTable({ rows = [], loading }: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

    const sortedRows = React.useMemo(() => {
        return [...rows].sort((a, b) => {
            const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return bTime - aTime;
        });
    }, [rows]);

    if (isSmall) {
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
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="center"
                            >
                                <Typography variant="body2" fontWeight={900}>
                                    {formatDate(row.createdAt)}
                                </Typography>

                                <Chip
                                    label={row.action}
                                    size="small"
                                    color={row.action === "BUY" ? "success" : "error"}
                                />
                            </Stack>

                            <Stack spacing={0.7}>
                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="caption" color="text.secondary">
                                        Symbol
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                        {row.symbol}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="caption" color="text.secondary">
                                        Timeframe
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                        {row.timeFrame}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="caption" color="text.secondary">
                                        Indicator
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                        {row.indicator?.name ?? "-"}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="caption" color="text.secondary">
                                        Status
                                    </Typography>
                                    <Typography variant="body2" fontWeight={700}>
                                        {row.isActive ? "Active" : "Inactive"}
                                    </Typography>
                                </Stack>

                                <Stack direction="row" justifyContent="space-between">
                                    <Typography variant="caption" color="text.secondary">
                                        Alert ID
                                    </Typography>
                                    <Typography
                                        variant="body2"
                                        fontWeight={700}
                                        sx={{
                                            maxWidth: "62%",
                                            textAlign: "right",
                                            wordBreak: "break-all",
                                        }}
                                    >
                                        {row.alertId}
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

    return (
        <Paper
            elevation={0}
            sx={{
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
                overflow: "hidden",
                bgcolor: "background.paper",
            }}
        >
            <TableContainer
                sx={{
                    maxHeight: 520,
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
                            <TableCell sx={{ minWidth: 210 }}>Created</TableCell>
                            <TableCell sx={{ minWidth: 110 }}>Symbol</TableCell>
                            <TableCell sx={{ minWidth: 110 }}>Timeframe</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>Indicator</TableCell>
                            <TableCell sx={{ minWidth: 110 }}>Action</TableCell>
                            <TableCell sx={{ minWidth: 110 }}>Status</TableCell>
                            <TableCell sx={{ minWidth: 260 }}>Alert ID</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {sortedRows.map((row) => (
                            <TableRow key={row.signalId} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={700}>
                                        {formatDate(row.createdAt)}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" fontWeight={900}>
                                        {row.symbol}
                                    </Typography>
                                </TableCell>

                                <TableCell>{row.timeFrame}</TableCell>

                                <TableCell>{row.indicator?.name ?? "-"}</TableCell>

                                <TableCell>
                                    <Chip
                                        label={row.action}
                                        size="small"
                                        color={row.action === "BUY" ? "success" : "error"}
                                    />
                                </TableCell>

                                <TableCell>{row.isActive ? "Active" : "Inactive"}</TableCell>

                                <TableCell
                                    sx={{
                                        wordBreak: "break-all",
                                    }}
                                >
                                    {row.alertId}
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