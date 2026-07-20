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

import StatusChip from "@/app/common/components/StatusChip";
import DeleteConfirmButton from "@/app/common/components/ConfirmDeleteButton";
import type { DomainCatalogue } from "../types/domainCatalogue.types";

type Props = {
    rows?: DomainCatalogue[];
    loading?: boolean;
    onView?: (row: DomainCatalogue) => void;
    onEdit?: (row: DomainCatalogue) => void;
    onDelete?: (row: DomainCatalogue) => void;
};

export default function DomainCatalogueTable({
                                                 rows = [],
                                                 loading,
                                                 onView,
                                                 onEdit,
                                                 onDelete,
                                             }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

    const renderActions = (row: DomainCatalogue) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end" flexWrap="wrap" useFlexGap>
            <Button
                size="small"
                variant="text"
                color="inherit"
                onClick={() => onView?.(row)}
                sx={{ textTransform: "none", fontWeight: 700 }}
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
                confirmTitle="Delete domain"
                confirmText={`Are you sure you want to delete "${row.displayName}"?`}
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
                                    {row.displayName}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {row.domainKey} · {row.domainCategory}
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <StatusChip
                                    label={row.isActive ? "Active" : "Inactive"}
                                    color={row.isActive ? "success" : "default"}
                                />
                                <StatusChip
                                    label={`${row.channelsToUse?.length ?? 0} channels`}
                                    color="default"
                                />
                            </Stack>

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
                            No domains found.
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
                    height: { xs: 360, sm: 420, md: 480, lg: 520 },
                    overflowY: "auto",
                    overflowX: "auto",
                }}
            >
                <Table stickyHeader size="medium" sx={{ minWidth: 980 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 240 }}>Name</TableCell>
                            <TableCell sx={{ minWidth: 180 }}>Domain key</TableCell>
                            <TableCell sx={{ minWidth: 180 }}>Category</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>Channels</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>Status</TableCell>
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
                                        {row.displayName}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                        {row.domainKey}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Typography variant="body2" fontWeight={700} noWrap>
                                        {row.domainCategory}
                                    </Typography>
                                </TableCell>

                                <TableCell>
                                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                        {(row.channelsToUse ?? []).map((ch) => (
                                            <StatusChip
                                                key={ch.channel}
                                                label={ch.channel.toUpperCase()}
                                                color={ch.channel === "email" ? "info" : "warning"}
                                            />
                                        ))}
                                        {(!row.channelsToUse || row.channelsToUse.length === 0) && (
                                            <StatusChip label="None" color="default" />
                                        )}
                                    </Stack>
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
                                            No domains found.
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