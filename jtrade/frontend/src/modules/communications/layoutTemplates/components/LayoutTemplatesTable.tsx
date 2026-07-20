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

import DeleteConfirmButton from "@/app/common/components/ConfirmDeleteButton";
import StatusChip from "@/app/common/components/StatusChip";
import type { LayoutTemplate } from "../types/layoutTemplates.types";

type Props = {
    rows?: LayoutTemplate[];
    loading?: boolean;
    onView?: (row: LayoutTemplate) => void;
    onEdit?: (row: LayoutTemplate) => void;
    onDelete?: (row: LayoutTemplate) => void;
};

export default function LayoutTemplatesTable({
                                                 rows = [],
                                                 loading,
                                                 onView,
                                                 onEdit,
                                                 onDelete,
                                             }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const renderActions = (row: LayoutTemplate) => (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: "stretch", sm: "flex-end" }}
            flexWrap="wrap"
            useFlexGap
        >
            <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={() => onView?.(row)}
                sx={{
                    textTransform: "none",
                    fontWeight: 700,
                    minWidth: 60,
                }}
            >
                View
            </Button>

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
                confirmTitle="Delete layout template"
                confirmText={`Are you sure you want to delete "${row.name}"?`}
                description="This action cannot be undone."
                onConfirm={() => onDelete?.(row)}
            />
        </Stack>
    );

    if (isMobile) {
        return (
            <Stack spacing={1.5}>
                {rows.map((row) => (
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
                            <Box>
                                <Typography variant="body2" fontWeight={900} noWrap>
                                    {row.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {row.templateType.toUpperCase()} · {row.key}
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <StatusChip
                                    label={row.isDefault ? "Default" : "No"}
                                    color={row.isDefault ? "warning" : "default"}
                                />
                                <StatusChip
                                    label={row.isActive ? "Active" : "Inactive"}
                                    color={row.isActive ? "success" : "default"}
                                />
                            </Stack>

                            <Box sx={{ pt: 0.5 }}>{renderActions(row)}</Box>
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
                            No layout templates found.
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
                borderRadius: 4,
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "background.paper",
                overflow: "hidden",
            }}
        >
            <TableContainer
                sx={{
                    height: {
                        xs: 360,
                        sm: 400,
                        md: 460,
                        lg: 520,
                    },
                    overflowY: "auto",
                    overflowX: "auto",
                }}
            >
                <Table stickyHeader size="medium" sx={{ minWidth: 980 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 260 }}>Template name</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>Type</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>Key</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>Default</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>Active</TableCell>
                            <TableCell align="center" sx={{ minWidth: 240 }}>
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell>
                                    <Typography variant="body2" fontWeight={900} noWrap>
                                        {row.name}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                        {row.templateType.toUpperCase()}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {row.key}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <StatusChip
                                        label={row.isDefault ? "Default" : "No"}
                                        color={row.isDefault ? "warning" : "default"}
                                    />
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
                                <TableCell colSpan={6}>
                                    <Box sx={{ py: 4, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No layout templates found.
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