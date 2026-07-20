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

import type { CodeProject } from "@/modules/core/codeProjects/types/codeProjects";

type Props = {
    rows?: CodeProject[];
    loading?: boolean;
    mode?: "admin" | "provider";
    onRefresh?: () => void;
    onEdit?: (row: CodeProject) => void;
    onRemove?: (row: CodeProject) => void;
    onDeactivate?: (row: CodeProject) => void;
    onCreate?: () => void;
};

export default function CodeProjectsTable({
                                              rows = [],
                                              loading = false,
                                              mode = "admin",
                                              onRefresh,
                                              onEdit,
                                              onRemove,
                                              onDeactivate,
                                              onCreate,
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
                    Code projects
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {isProvider
                        ? "Create and manage your provider projects."
                        : "General view of all provider projects."}
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
                        Add project
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

    const renderStatus = (row: CodeProject) => (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <StatusChip
                label={row.status}
                color={
                    row.status === "published"
                        ? "success"
                        : row.status === "draft"
                            ? "default"
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

    const renderActions = (row: CodeProject) => (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: "stretch", sm: "center" }}
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
                    confirmTitle="Delete project"
                    confirmText={`Are you sure you want to delete "${row.name}"?`}
                    description="This action cannot be undone and will remove this project from your catalog."
                    onConfirm={() => onRemove?.(row)}
                    disabled={loading}
                />
            )}

            {!isProvider && (
                <DeleteConfirmButton
                    label="Deactivate"
                    color="warning"
                    size="small"
                    confirmTitle="Deactivate project"
                    confirmText={`Are you sure you want to deactivate "${row.name}"?`}
                    description="This will archive the project and mark it as inactive."
                    onConfirm={() => onDeactivate?.(row)}
                    disabled={loading || !row.isActive}
                />
            )}
        </Stack>
    );

    const renderCard = (row: CodeProject) => (
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
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={900} noWrap>
                        {row.name}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" noWrap>
                        {row.projectKey}
                    </Typography>
                </Box>

                <Typography variant="body2" color="text.secondary">
                    {row.description || "—"}
                </Typography>

                <Stack spacing={0.5}>
                    {row.typeProject && (
                        <Typography variant="caption" color="text.secondary">
                            Type: {row.typeProject.name}
                        </Typography>
                    )}

                    {row.companyProvider && (
                        <Typography variant="caption" color="text.secondary">
                            Company: {row.companyProvider.companyName}
                        </Typography>
                    )}
                </Stack>

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
                                No code projects found.
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
                <Table size="medium" stickyHeader sx={{ minWidth: 1120 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 220 }}>Project</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>Key</TableCell>
                            <TableCell sx={{ minWidth: 180 }}>Type</TableCell>
                            {!isProvider && (
                                <TableCell sx={{ minWidth: 220 }}>Company</TableCell>
                            )}
                            <TableCell sx={{ minWidth: 260 }}>Description</TableCell>
                            <TableCell sx={{ minWidth: 190 }}>Status</TableCell>
                            <TableCell sx={{ minWidth: 180 }} align="center">
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row) => (
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
                                        {row.name}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" noWrap>
                                        {row.projectKey}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {row.typeProject?.name ?? "—"}
                                    </Typography>
                                </TableCell>

                                {!isProvider && (
                                    <TableCell>
                                        <Typography variant="body2" color="text.secondary">
                                            {row.companyProvider?.companyName ?? "—"}
                                        </Typography>
                                    </TableCell>
                                )}

                                <TableCell>
                                    <Typography variant="body2" color="text.secondary">
                                        {row.description || "—"}
                                    </Typography>
                                </TableCell>

                                <TableCell>{renderStatus(row)}</TableCell>

                                <TableCell align="center">{renderActions(row)}</TableCell>
                            </TableRow>
                        ))}

                        {rows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={isProvider ? 6 : 7}>
                                    <Box sx={{ py: 4, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No code projects found.
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