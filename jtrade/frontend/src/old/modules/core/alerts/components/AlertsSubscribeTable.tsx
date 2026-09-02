// FILE: src/modules/alerts/components/AlertsSubscribeTable.tsx
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
import type { AlertGroupRow } from "../types/alerts";

type Props = {
    rows?: AlertGroupRow[];
    loading?: boolean;
    onSubscribe?: (row: AlertGroupRow) => void;
};

export default function AlertsSubscribeTable({
                                                 rows = [],
                                                 loading,
                                                 onSubscribe,
                                             }: Props) {
    const theme = useTheme();
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

    const renderActions = (row: AlertGroupRow) => (
        <Button
            size="small"
            variant="contained"
            onClick={() => onSubscribe?.(row)}
            sx={{ textTransform: "none", fontWeight: 700 }}
        >
            Subscribe
        </Button>
    );

    // ===== MOBILE =====
    if (isSmall) {
        return (
            <Stack spacing={1.5}>
                {rows.map((row) => (
                    <Paper
                        key={row.groupId}
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            p: 1.5,
                            border: "1px solid",
                            borderColor: "divider",
                            bgcolor: theme.palette.background.paper,
                        }}
                    >
                        <Stack spacing={1}>
                            <Stack direction="row" spacing={1.5} alignItems="center">
                                <Box sx={{ minWidth: 0, flex: 1 }}>
                                    <Typography variant="body2" fontWeight={900} noWrap>
                                        {row.symbol} · {row.timeFrame}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" noWrap>
                                        {row.indicator?.name ?? "-"}
                                    </Typography>
                                </Box>

                                <StatusChip
                                    label={row.isActive ? "Active" : "Inactive"}
                                    color={row.isActive ? "success" : "default"}
                                />
                            </Stack>

                            <Stack direction="row" justifyContent="flex-end" sx={{ mt: 0.5 }}>
                                {renderActions(row)}
                            </Stack>
                        </Stack>
                    </Paper>
                ))}

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
        );
    }

    // ===== DESKTOP =====
    return (
        <TableContainer
            component={Paper}
            sx={{ borderRadius: 3, overflowX: "auto", boxShadow: "none" }}
        >
            <Table size="medium" sx={{ minWidth: 900 }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ width: "18%" }}>Symbol</TableCell>
                        <TableCell sx={{ width: "12%" }}>Timeframe</TableCell>
                        <TableCell sx={{ width: "40%" }}>Indicator</TableCell>
                        <TableCell sx={{ width: "15%" }}>Status</TableCell>
                        <TableCell sx={{ width: "15%" }} align="center">
                            Actions
                        </TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {rows.map((row) => (
                        <TableRow
                            key={row.groupId}
                            hover
                            sx={{ "&:last-of-type td, &:last-of-type th": { borderBottom: 0 } }}
                        >
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
                                <Typography variant="body2" fontWeight={600} noWrap>
                                    {row.indicator?.name ?? "-"}
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
                    ))}

                    {rows.length === 0 && !loading && (
                        <TableRow>
                            <TableCell colSpan={5}>
                                <Box sx={{ py: 4, textAlign: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
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