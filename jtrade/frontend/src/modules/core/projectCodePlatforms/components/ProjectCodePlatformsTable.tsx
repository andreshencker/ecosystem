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

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

import StatusChip from "@/app/common/components/StatusChip";
import DeleteConfirmButton from "@/app/common/components/ConfirmDeleteButton";

import type { ProjectCodePlatform } from "../types/projectCodePlatforms";

type Props = {
    rows?: ProjectCodePlatform[];
    loading?: boolean;
    mode?: "admin" | "provider";
    onRefresh?: () => void;
    onCreate?: () => void;
    onEdit?: (row: ProjectCodePlatform) => void;
    onRemove?: (row: ProjectCodePlatform) => void;
    onDeactivate?: (row: ProjectCodePlatform) => void;
};

export default function ProjectCodePlatformsTable({
                                                      rows = [],
                                                      loading = false,
                                                      mode = "admin",
                                                      onRefresh,
                                                      onCreate,
                                                      onEdit,
                                                      onRemove,
                                                      onDeactivate,
                                                  }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const isProvider = mode === "provider";

    const header = (
        <Box
            sx={{
                mb: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1.5,
                flexWrap: "wrap",
            }}
        >
            <Box>
                <Typography variant="h6" fontWeight={800}>
                    Project platforms
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {isProvider
                        ? "Assign your projects to supported platforms."
                        : "General view of project-platform assignments."}
                </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
                {isProvider && onCreate && (
                    <Button
                        variant="contained"
                        startIcon={<AddRoundedIcon />}
                        onClick={onCreate}
                        disabled={loading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 800,
                            borderRadius: 999,
                            px: 2,
                            whiteSpace: "nowrap",
                        }}
                    >
                        Add platform
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
    );

    const renderStatus = (row: ProjectCodePlatform) => (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <StatusChip
                label={row.status}
                color={
                    row.status === "published"
                        ? "success"
                        : row.status === "suspended"
                            ? "warning"
                            : "default"
                }
            />

            <StatusChip
                label={row.isActive ? "Active" : "Inactive"}
                color={row.isActive ? "success" : "default"}
            />
        </Stack>
    );

    const renderActions = (row: ProjectCodePlatform) => (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent="center"
            flexWrap="wrap"
            useFlexGap
        >
            {isProvider && (
                <Button
                    size="small"
                    variant={isDark ? "outlined" : "contained"}
                    color="inherit"
                    onClick={() => onEdit?.(row)}
                    disabled={loading}
                    sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        ...(isDark && {
                            borderColor: "divider",
                            bgcolor: "rgba(255,255,255,0.02)",
                        }),
                    }}
                >
                    Edit
                </Button>
            )}

            {isProvider && (
                <DeleteConfirmButton
                    label="Delete"
                    color="error"
                    size="small"
                    confirmTitle="Delete project platform"
                    confirmText={`Are you sure you want to delete this platform assignment?`}
                    description="This action cannot be undone."
                    onConfirm={() => onRemove?.(row)}
                    disabled={loading}
                />
            )}

            {!isProvider && (
                <DeleteConfirmButton
                    label="Deactivate"
                    color="warning"
                    size="small"
                    confirmTitle="Deactivate project platform"
                    confirmText="Are you sure you want to deactivate this project platform?"
                    description="This will archive the assignment and mark it as inactive."
                    onConfirm={() => onDeactivate?.(row)}
                    disabled={loading || !row.isActive}
                />
            )}
        </Stack>
    );

    const renderCard = (row: ProjectCodePlatform) => (
        <Paper
            key={row.id}
            elevation={0}
            sx={{
                borderRadius: 3,
                p: 1.5,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: theme.palette.background.paper,
            }}
        >
            <Stack spacing={1.2}>
                <Box>
                    <Typography variant="body2" fontWeight={900}>
                        {row.codeProject?.name ?? "Project"}
                    </Typography>

                    <Typography variant="caption" color="text.secondary">
                        {row.platform?.name ?? "Platform"}
                    </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                    Delivery: {row.deliveryMode} · Runtime: {row.runtimeMode}
                </Typography>

                {row.notes && (
                    <Typography variant="body2" color="text.secondary">
                        {row.notes}
                    </Typography>
                )}

                <Box>{renderStatus(row)}</Box>

                <Box sx={{ pt: 0.5 }}>{renderActions(row)}</Box>
            </Stack>
        </Paper>
    );

    if (isMobile || isTablet) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {header}

                <Stack spacing={1.5} sx={{ overflowY: "auto", minHeight: 0 }}>
                    {rows.map(renderCard)}

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
                                No project platforms found.
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            </Box>
        );
    }

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
            {header}

            <TableContainer
                component={Paper}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    borderRadius: 3,
                    overflowX: "auto",
                    overflowY: "auto",
                    boxShadow: "none",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Table size="medium" stickyHeader sx={{ minWidth: 1100 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 220 }}>Project</TableCell>
                            <TableCell sx={{ minWidth: 180 }}>Platform</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>Delivery</TableCell>
                            <TableCell sx={{ minWidth: 170 }}>Runtime</TableCell>
                            <TableCell sx={{ minWidth: 220 }}>Notes</TableCell>
                            <TableCell sx={{ minWidth: 190 }}>Status</TableCell>
                            <TableCell sx={{ minWidth: 180 }} align="center">
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={900}>
                                        {row.codeProject?.name ?? "—"}
                                    </Typography>

                                    <Typography variant="caption" color="text.secondary">
                                        {row.codeProject?.projectKey ?? ""}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {row.platform?.name ?? "—"}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {row.deliveryMode}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {row.runtimeMode}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {row.notes || "—"}
                                    </Typography>
                                </TableCell>

                                <TableCell>{renderStatus(row)}</TableCell>

                                <TableCell align="center">{renderActions(row)}</TableCell>
                            </TableRow>
                        ))}

                        {rows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={7}>
                                    <Box sx={{ py: 4, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No project platforms found.
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