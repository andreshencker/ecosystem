import * as React from "react";
import {
    Box,
    Button,
    Chip,
    CircularProgress,
    IconButton,
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
} from "@mui/material";

import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";

import type { Indicator } from "../types/indicators";

type Props = {
    rows: Indicator[];
    loading?: boolean;
    showCompany?: boolean;
    onRefresh?: () => void | Promise<void>;
    onAdd?: () => void;
    onEdit?: (row: Indicator) => void;
    onDelete?: (row: Indicator) => void;
};

export default function IndicatorsTable({
                                            rows,
                                            loading,
                                            showCompany = false,
                                            onRefresh,
                                            onAdd,
                                            onEdit,
                                            onDelete,
                                        }: Props) {
    return (
        <Box
            sx={{
                height: "100%",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
            }}
        >
            <Box sx={{ mb: 1.5, flexShrink: 0 }}>
                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    spacing={2}
                    flexWrap="wrap"
                >
                    <Box>
                        <Typography variant="h5" fontWeight={900}>
                            Indicators
                        </Typography>

                        <Typography variant="body2" color="text.secondary">
                            Manage provider indicators.
                        </Typography>
                    </Box>

                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={onAdd}
                            sx={{
                                borderRadius: 999,
                                px: 2.5,
                                textTransform: "none",
                                fontWeight: 800,
                            }}
                        >
                            Add indicator
                        </Button>

                        <Tooltip title="Refresh">
                            <span>
                                <IconButton onClick={onRefresh} disabled={loading}>
                                    <RefreshIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Box>

            <TableContainer
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "auto",
                    border: "1px solid",
                    borderColor: "divider",
                    borderRadius: 5,
                    bgcolor: "background.paper",
                }}
            >
                {loading ? (
                    <Box
                        sx={{
                            height: "100%",
                            minHeight: 300,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                        }}
                    >
                        <CircularProgress />
                    </Box>
                ) : rows.length === 0 ? (
                    <Box
                        sx={{
                            minHeight: 300,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            p: 3,
                        }}
                    >
                        <Typography color="text.secondary">
                            No indicators found.
                        </Typography>
                    </Box>
                ) : (
                    <Table stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Key</TableCell>

                                {showCompany && <TableCell>Company</TableCell>}

                                <TableCell>Description</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <Stack spacing={0.5}>
                                            <Typography fontWeight={800}>
                                                {row.name}
                                            </Typography>

                                            <Typography
                                                variant="caption"
                                                color="text.secondary"
                                            >
                                                {row.id}
                                            </Typography>
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <Chip
                                            label={row.key}
                                            size="small"
                                            sx={{ fontWeight: 700 }}
                                        />
                                    </TableCell>

                                    {showCompany && (
                                        <TableCell>
                                            <Stack spacing={0.5}>
                                                <Typography fontWeight={700}>
                                                    {row.companyProvider
                                                        ?.companyName ?? "-"}
                                                </Typography>

                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {row.companyProvider
                                                        ?.status ?? "-"}
                                                </Typography>
                                            </Stack>
                                        </TableCell>
                                    )}

                                    <TableCell>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                            sx={{
                                                maxWidth: 420,
                                                overflow: "hidden",
                                                textOverflow: "ellipsis",
                                                whiteSpace: "nowrap",
                                            }}
                                        >
                                            {row.description || "-"}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Stack
                                            direction="row"
                                            alignItems="center"
                                            spacing={1}
                                        >
                                            <Switch
                                                checked={!!row.isActive}
                                                disabled
                                                size="small"
                                            />

                                            <Typography
                                                fontWeight={700}
                                                color={
                                                    row.isActive
                                                        ? "success.main"
                                                        : "text.secondary"
                                                }
                                            >
                                                {row.isActive
                                                    ? "Active"
                                                    : "Inactive"}
                                            </Typography>
                                        </Stack>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            justifyContent="flex-end"
                                        >
                                            <Button
                                                size="small"
                                                variant="outlined"
                                                startIcon={<EditOutlinedIcon />}
                                                onClick={() => onEdit?.(row)}
                                                sx={{
                                                    textTransform: "none",
                                                    fontWeight: 700,
                                                    borderRadius: 3,
                                                }}
                                            >
                                                Edit
                                            </Button>

                                            <Button
                                                size="small"
                                                variant="outlined"
                                                color="error"
                                                startIcon={<DeleteOutlineIcon />}
                                                onClick={() => onDelete?.(row)}
                                                sx={{
                                                    textTransform: "none",
                                                    fontWeight: 700,
                                                    borderRadius: 3,
                                                }}
                                            >
                                                Delete
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </TableContainer>
        </Box>
    );
}