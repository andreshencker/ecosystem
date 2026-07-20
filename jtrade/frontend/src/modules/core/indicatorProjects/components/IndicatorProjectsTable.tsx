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
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import RefreshIcon from "@mui/icons-material/Refresh";

import type { IndicatorProject } from "../types/indicatorProjects";

type Props = {
    rows?: IndicatorProject[] | null;
    loading?: boolean;
    showCompany?: boolean;
    adminMode?: boolean;
    onRefresh?: () => void | Promise<void>;
    onAdd?: () => void;
    onEdit?: (row: IndicatorProject) => void;
    onDelete?: (row: IndicatorProject) => void;
};

export default function IndicatorProjectsTable({
                                                   rows,
                                                   loading,
                                                   showCompany = false,
                                                   adminMode = false,
                                                   onRefresh,
                                                   onAdd,
                                                   onEdit,
                                                   onDelete,
                                               }: Props) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const safeRows: IndicatorProject[] = Array.isArray(rows) ? rows : [];

    const header = (
        <Box sx={{ mb: 2, flexShrink: 0 }}>
            <Stack
                direction={{ xs: "column", sm: "row" }}
                alignItems={{ xs: "stretch", sm: "center" }}
                justifyContent="space-between"
                spacing={2}
            >
                <Box>
                    <Typography variant="h5" fontWeight={900} sx={{ lineHeight: 1.1 }}>
                        Indicator projects
                    </Typography>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                        Assign indicators to project platforms.
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                    {!adminMode && (
                        <Button
                            variant="contained"
                            startIcon={<AddIcon />}
                            onClick={onAdd}
                            sx={{
                                height: 44,
                                borderRadius: 999,
                                px: 2.5,
                                textTransform: "none",
                                fontWeight: 800,
                                flex: { xs: 1, sm: "initial" },
                                whiteSpace: "nowrap",
                            }}
                        >
                            Assign indicator
                        </Button>
                    )}

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

    if (loading || safeRows.length === 0) {
        return (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {header}

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
                    {loading ? (
                        <CircularProgress />
                    ) : (
                        <Typography color="text.secondary">
                            No indicator projects found.
                        </Typography>
                    )}
                </Box>
            </Box>
        );
    }

    if (isMobile) {
        return (
            <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
                {header}

                <Stack
                    spacing={1.5}
                    sx={{
                        flex: 1,
                        minHeight: 0,
                        overflowY: "auto",
                        pb: 1,
                    }}
                >
                    {safeRows.map((row) => {
                        const pcp = row.projectCodePlatform;

                        return (
                            <Paper
                                key={row.id}
                                elevation={0}
                                sx={{
                                    border: "1px solid",
                                    borderColor: "divider",
                                    borderRadius: 4,
                                    bgcolor: "background.paper",
                                    p: 2,
                                }}
                            >
                                <Stack spacing={1.5}>
                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Project / Platform
                                        </Typography>

                                        <Typography fontWeight={900}>
                                            {pcp?.codeProject?.name ?? "-"}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">
                                            {pcp?.platform?.name ?? "-"} · {pcp?.runtimeMode ?? "-"}
                                        </Typography>
                                    </Box>

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Indicator
                                        </Typography>

                                        <Stack
                                            direction="row"
                                            spacing={1}
                                            alignItems="center"
                                            flexWrap="wrap"
                                            useFlexGap
                                        >
                                            <Typography fontWeight={900}>
                                                {row.indicator?.name ?? "-"}
                                            </Typography>

                                            <Chip
                                                label={row.indicator?.key ?? row.indicatorId ?? "-"}
                                                size="small"
                                                sx={{ width: "fit-content" }}
                                            />
                                        </Stack>
                                    </Box>

                                    {showCompany && (
                                        <Box>
                                            <Typography variant="caption" color="text.secondary">
                                                Company
                                            </Typography>

                                            <Typography fontWeight={800}>
                                                {row.companyProvider?.companyName ?? "-"}
                                            </Typography>

                                            <Typography variant="body2" color="text.secondary">
                                                {row.companyProvider?.status ?? "-"}
                                            </Typography>
                                        </Box>
                                    )}

                                    <Box>
                                        <Typography variant="caption" color="text.secondary">
                                            Notes
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary">
                                            {row.notes || "-"}
                                        </Typography>
                                    </Box>

                                    <Stack direction="row" alignItems="center" spacing={1}>
                                        <Switch checked={!!row.isActive} disabled size="small" />

                                        <Typography
                                            fontWeight={800}
                                            color={row.isActive ? "success.main" : "text.secondary"}
                                        >
                                            {row.isActive ? "Active" : "Inactive"}
                                        </Typography>
                                    </Stack>

                                    <Stack direction="row" spacing={1}>
                                        {!adminMode && (
                                            <Button
                                                fullWidth
                                                size="small"
                                                variant="outlined"
                                                startIcon={<EditOutlinedIcon />}
                                                onClick={() => onEdit?.(row)}
                                                sx={{
                                                    textTransform: "none",
                                                    fontWeight: 800,
                                                    borderRadius: 3,
                                                }}
                                            >
                                                Edit
                                            </Button>
                                        )}

                                        <Button
                                            fullWidth
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            startIcon={<DeleteOutlineIcon />}
                                            onClick={() => onDelete?.(row)}
                                            sx={{
                                                textTransform: "none",
                                                fontWeight: 800,
                                                borderRadius: 3,
                                            }}
                                        >
                                            {adminMode ? "Deactivate" : "Delete"}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Paper>
                        );
                    })}
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            {header}

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
                <Table stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Project / Platform</TableCell>
                            <TableCell>Indicator</TableCell>
                            {showCompany && <TableCell>Company</TableCell>}
                            <TableCell>Notes</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {safeRows.map((row) => {
                            const pcp = row.projectCodePlatform;

                            return (
                                <TableRow key={row.id} hover>
                                    <TableCell>
                                        <Stack spacing={0.5}>
                                            <Typography fontWeight={800}>
                                                {pcp?.codeProject?.name ?? "-"}
                                            </Typography>

                                            <Typography variant="caption" color="text.secondary">
                                                {pcp?.platform?.name ?? "-"} · {pcp?.runtimeMode ?? "-"}
                                            </Typography>
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <Stack spacing={0.5}>
                                            <Typography fontWeight={800}>
                                                {row.indicator?.name ?? "-"}
                                            </Typography>

                                            <Chip
                                                label={row.indicator?.key ?? row.indicatorId ?? "-"}
                                                size="small"
                                                sx={{ width: "fit-content" }}
                                            />
                                        </Stack>
                                    </TableCell>

                                    {showCompany && (
                                        <TableCell>
                                            <Typography fontWeight={700}>
                                                {row.companyProvider?.companyName ?? "-"}
                                            </Typography>

                                            <Typography variant="caption" color="text.secondary">
                                                {row.companyProvider?.status ?? "-"}
                                            </Typography>
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
                                            {row.notes || "-"}
                                        </Typography>
                                    </TableCell>

                                    <TableCell>
                                        <Stack direction="row" alignItems="center" spacing={1}>
                                            <Switch checked={!!row.isActive} disabled size="small" />

                                            <Typography
                                                fontWeight={700}
                                                color={row.isActive ? "success.main" : "text.secondary"}
                                            >
                                                {row.isActive ? "Active" : "Inactive"}
                                            </Typography>
                                        </Stack>
                                    </TableCell>

                                    <TableCell align="right">
                                        <Stack direction="row" spacing={1} justifyContent="flex-end">
                                            {!adminMode && (
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
                                            )}

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
                                                {adminMode ? "Deactivate" : "Delete"}
                                            </Button>
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}