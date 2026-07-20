import * as React from "react";

import {
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
    Paper,
    Stack,
    Switch,
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

import AddIcon from "@mui/icons-material/Add";
import RefreshIcon from "@mui/icons-material/Refresh";

import type { SymbolItem } from "../types/symbols";

type Props = {
    rows?: SymbolItem[];
    loading?: boolean;
    showCompany?: boolean;
    onRefresh?: () => void | Promise<void>;
    onAdd?: () => void;
    onEdit?: (row: SymbolItem) => void;
    onDelete?: (row: SymbolItem) => void;
    onToggleActive?: (row: SymbolItem, next: boolean) => void | Promise<void>;
};

export default function SymbolsTable({
                                         rows = [],
                                         loading,
                                         showCompany = false,
                                         onRefresh,
                                         onAdd,
                                         onEdit,
                                         onDelete,
                                         onToggleActive,
                                     }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const Header = (
        <Box sx={{ mb: 2, flexShrink: 0 }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
                spacing={2}
            >
                <Box>
                    <Typography variant="h5" fontWeight={900}>
                        Symbols
                    </Typography>

                    <Typography variant="body2" color="text.secondary">
                        Manage symbols available for alerts.
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={onAdd}
                        disabled={loading}
                        sx={{
                            height: 44,
                            borderRadius: 999,
                            px: 2.5,
                            textTransform: "none",
                            fontWeight: 900,
                            flex: { xs: 1, sm: "initial" },
                            whiteSpace: "nowrap",
                        }}
                    >
                        Add symbol
                    </Button>

                    <Tooltip title="Refresh">
                        <span>
                            <IconButton
                                onClick={onRefresh}
                                disabled={loading}
                                sx={{
                                    width: 44,
                                    height: 44,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    flexShrink: 0,
                                }}
                            >
                                <RefreshIcon />
                            </IconButton>
                        </span>
                    </Tooltip>
                </Stack>
            </Stack>
        </Box>
    );

    const renderActions = (row: SymbolItem) => (
        <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
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

            <Button
                size="small"
                variant="outlined"
                color="error"
                onClick={() => onDelete?.(row)}
                sx={{
                    textTransform: "none",
                    fontWeight: 800,
                    borderRadius: 3,
                    px: 1.8,
                    minWidth: 72,
                }}
            >
                Delete
            </Button>
        </Stack>
    );

    const renderStatus = (row: SymbolItem) => (
        <Stack direction="row" alignItems="center" spacing={1}>
            <Switch
                size="small"
                checked={!!row.isActive}
                disabled={loading}
                onChange={(e) => onToggleActive?.(row, e.target.checked)}
            />

            <Chip
                label={row.isActive ? "Active" : "Inactive"}
                color={row.isActive ? "success" : "default"}
                size="small"
                sx={{ fontWeight: 800 }}
            />
        </Stack>
    );

    const LoadingBox = (
        <Box
            sx={{
                flex: 1,
                minHeight: 260,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: "1px solid",
                borderColor: "divider",
                borderRadius: 5,
                bgcolor: "background.paper",
            }}
        >
            <CircularProgress />
        </Box>
    );

    if (loading) {
        return (
            <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
                {Header}
                {LoadingBox}
            </Box>
        );
    }

    if (isMobile || isTablet) {
        return (
            <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
                {Header}

                <Box
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        overflowX: "hidden",
                        pr: 0.5,
                        pb: 1,
                    }}
                >
                    <Stack spacing={1.5}>
                        {rows.map((row) => (
                            <Paper
                                key={row.id}
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    p: { xs: 1.5, sm: 2 },
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
                                            <Typography variant="caption" color="text.secondary">
                                                Symbol
                                            </Typography>

                                            <Typography variant="body1" fontWeight={900} noWrap>
                                                {row.symbol}
                                            </Typography>
                                        </Box>

                                        <Chip
                                            label={row.isActive ? "Active" : "Inactive"}
                                            color={row.isActive ? "success" : "default"}
                                            size="small"
                                            sx={{ fontWeight: 800, flexShrink: 0 }}
                                        />
                                    </Stack>

                                    {showCompany && (
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Company
                                            </Typography>

                                            <Typography variant="body2" fontWeight={800} noWrap>
                                                {row.companyProvider?.companyName ?? "-"}
                                            </Typography>

                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                {row.companyProvider?.status ?? "-"}
                                            </Typography>
                                        </Box>
                                    )}

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Status
                                        </Typography>

                                        {renderStatus(row)}
                                    </Box>

                                    <Stack direction="row" justifyContent="flex-end">
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
                                    No symbols found.
                                </Typography>
                            </Paper>
                        )}
                    </Stack>
                </Box>
            </Box>
        );
    }

    return (
        <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
            {Header}

            <TableContainer
                component={Paper}
                sx={{
                    flex: 1,
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
                    stickyHeader
                    sx={{
                        minWidth: showCompany ? 980 : 760,
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
                            <TableCell sx={{ width: showCompany ? 240 : 280 }}>
                                Symbol
                            </TableCell>

                            {showCompany && (
                                <TableCell sx={{ width: 320 }}>
                                    Company
                                </TableCell>
                            )}

                            <TableCell sx={{ width: 220 }}>
                                Status
                            </TableCell>

                            <TableCell sx={{ width: 220 }} align="center">
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={900} noWrap>
                                        {row.symbol}
                                    </Typography>
                                </TableCell>

                                {showCompany && (
                                    <TableCell>
                                        <Typography variant="body2" fontWeight={800} noWrap>
                                            {row.companyProvider?.companyName ?? "-"}
                                        </Typography>

                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {row.companyProvider?.status ?? "-"}
                                        </Typography>
                                    </TableCell>
                                )}

                                <TableCell>
                                    {renderStatus(row)}
                                </TableCell>

                                <TableCell align="center">
                                    {renderActions(row)}
                                </TableCell>
                            </TableRow>
                        ))}

                        {rows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={showCompany ? 4 : 3}>
                                    <Box sx={{ py: 4, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No symbols found.
                                        </Typography>
                                    </Box>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}