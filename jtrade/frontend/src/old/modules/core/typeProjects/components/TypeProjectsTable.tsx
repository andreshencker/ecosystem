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
import DeleteConfirmButton from "@/old/app/common/components/ConfirmDeleteButton";

import type { TypeProject } from "../types/typeProject";

type Props = {
    rows?: TypeProject[];
    loading?: boolean;
    onEdit: (row: TypeProject) => void;
    onDeactivate: (row: TypeProject) => void;
    onDelete: (row: TypeProject) => void;
};

export default function TypeProjectsTable({
                                              rows = [],
                                              loading,
                                              onEdit,
                                              onDeactivate,
                                              onDelete,
                                          }: Props) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const renderActions = (row: TypeProject) => (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Button
                size="small"
                variant="contained"
                color="inherit"
                onClick={() => onEdit(row)}
                disabled={loading}
                sx={{ textTransform: "none", fontWeight: 700 }}
            >
                Edit
            </Button>

            <DeleteConfirmButton
                label="Deactivate"
                color="warning"
                size="small"
                confirmTitle="Deactivate type project"
                confirmText={`Are you sure you want to deactivate "${row.name}"?`}
                description="This will keep the record but mark it as inactive."
                onConfirm={() => onDeactivate(row)}
                disabled={loading || !row.isActive}
            />

            <DeleteConfirmButton
                label="Delete"
                color="error"
                size="small"
                confirmTitle="Delete type project"
                confirmText={`Are you sure you want to delete "${row.name}"?`}
                description="This action cannot be undone."
                onConfirm={() => onDelete(row)}
                disabled={loading}
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
                        }}
                    >
                        <Stack spacing={1.2}>
                            <Box>
                                <Typography variant="body2" fontWeight={900}>
                                    {row.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {row.key}
                                </Typography>
                            </Box>

                            <Typography variant="body2" color="text.secondary">
                                {row.description || "No description"}
                            </Typography>

                            <StatusChip
                                label={row.isActive ? "Active" : "Inactive"}
                                color={row.isActive ? "success" : "default"}
                            />

                            {renderActions(row)}
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
                            No type projects found.
                        </Typography>
                    </Paper>
                )}
            </Stack>
        );
    }

    return (
        <TableContainer
            component={Paper}
            sx={{
                borderRadius: 3,
                boxShadow: "none",
                border: "1px solid",
                borderColor: "divider",
                height: "100%",
                maxHeight: "100%",
                overflowX: "auto",
                overflowY: "auto",
            }}
        >
            <Table size="medium" stickyHeader sx={{ minWidth: 980 }}>
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ minWidth: 220 }}>Type</TableCell>
                        <TableCell sx={{ minWidth: 180 }}>Key</TableCell>
                        <TableCell sx={{ minWidth: 320 }}>Description</TableCell>
                        <TableCell sx={{ minWidth: 140 }}>Status</TableCell>
                        <TableCell align="center" sx={{ minWidth: 320 }}>
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
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    ID: {row.id}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                    {row.key}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <Typography variant="body2" color="text.secondary">
                                    {row.description || "No description"}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <StatusChip
                                    label={row.isActive ? "Active" : "Inactive"}
                                    color={row.isActive ? "success" : "default"}
                                />
                            </TableCell>

                            <TableCell align="center">
                                <Stack
                                    direction="row"
                                    spacing={1}
                                    alignItems="center"
                                    justifyContent="center"
                                    flexWrap="wrap"
                                    useFlexGap
                                >
                                    {renderActions(row)}
                                </Stack>
                            </TableCell>
                        </TableRow>
                    ))}

                    {rows.length === 0 && !loading && (
                        <TableRow>
                            <TableCell colSpan={5}>
                                <Box sx={{ py: 4, textAlign: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No type projects found.
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