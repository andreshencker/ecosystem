import * as React from "react";
import {
    Avatar,
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

import type { Platform } from "@/modules/core/platforms/types/platforms";
import StatusChip from "@/app/common/components/StatusChip";
import DeleteConfirmButton from "@/app/common/components/ConfirmDeleteButton";

type Props = {
    rows?: Platform[];
    loading?: boolean;
    onRefresh?: () => void;
    onAdd?: () => void;
    onEdit: (row: Platform) => void;
    onDelete: (row: Platform) => void;
};

function getId(row: any) {
    return String(row?.id ?? row?._id ?? "");
}

function connectionTypeLabel(type: Platform["connectionType"]) {
    if (type === "apikey") return "API key";
    if (type === "oauth") return "OAuth";
    return "None";
}

function connectionTypeColor(type: Platform["connectionType"]) {
    if (type === "apikey") return "warning";
    if (type === "oauth") return "info";
    return "default";
}

export default function PlatformsTable({
                                           rows = [],
                                           loading = false,
                                           onRefresh,
                                           onAdd,
                                           onEdit,
                                           onDelete,
                                       }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const renderActions = (row: Platform) => (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: "stretch", sm: "center" }}
            flexWrap="wrap"
            useFlexGap
        >
            <Button
                size="small"
                variant={isDark ? "outlined" : "contained"}
                color="inherit"
                onClick={() => onEdit(row)}
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

            <DeleteConfirmButton
                label="Delete"
                color="error"
                size="small"
                confirmTitle="Delete platform"
                confirmText={`Are you sure you want to delete "${row.name}"?`}
                description="This action cannot be undone and will remove this platform from JTrade."
                onConfirm={() => onDelete(row)}
                disabled={loading as any}
            />
        </Stack>
    );

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
                    Platforms
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Manage supported platforms, connection type and availability in JTrade.
                </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
                {onAdd && (
                    <Button
                        variant="contained"
                        startIcon={<AddRoundedIcon />}
                        onClick={onAdd}
                        sx={{ textTransform: "none", fontWeight: 800 }}
                    >
                        Add platform
                    </Button>
                )}

                <Tooltip title="Reload">
                    <span>
                        <IconButton size="small" onClick={onRefresh} disabled={loading || !onRefresh}>
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

    if (isMobile) {
        return (
            <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
                {header}

                <Stack spacing={1.5} sx={{ overflowY: "auto", minHeight: 0 }}>
                    {rows.map((row) => (
                        <Paper
                            key={getId(row)}
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
                                <Stack direction="row" spacing={1.5} alignItems="center">
                                    <Avatar src={row.imageUrl} alt={row.name} sx={{ width: 36, height: 36 }}>
                                        {row.name?.[0]?.toUpperCase() ?? "P"}
                                    </Avatar>

                                    <Box sx={{ minWidth: 0, flex: 1 }}>
                                        <Typography variant="body2" fontWeight={800} noWrap>
                                            {row.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            ID: {getId(row)}
                                        </Typography>
                                    </Box>
                                </Stack>

                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <StatusChip
                                        label={row.category.charAt(0).toUpperCase() + row.category.slice(1)}
                                        color="default"
                                    />
                                    <StatusChip
                                        label={connectionTypeLabel(row.connectionType)}
                                        color={connectionTypeColor(row.connectionType) as any}
                                    />
                                    <StatusChip
                                        label={row.isActive ? "Active" : "Inactive"}
                                        color={row.isActive ? "success" : "default"}
                                    />
                                    <StatusChip
                                        label={row.isSupported ? "Supported" : "Not supported"}
                                        color={row.isSupported ? "success" : "default"}
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
                                No platforms found.
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            </Box>
        );
    }

    if (isTablet) {
        return (
            <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
                {header}

                <Stack spacing={1.5} sx={{ overflowY: "auto", minHeight: 0 }}>
                    {rows.map((row) => (
                        <Paper
                            key={getId(row)}
                            elevation={0}
                            sx={{
                                borderRadius: 3,
                                p: 2,
                                border: "1px solid",
                                borderColor: "divider",
                                bgcolor: theme.palette.background.paper,
                            }}
                        >
                            <Stack spacing={1.4}>
                                <Stack
                                    direction="row"
                                    justifyContent="space-between"
                                    alignItems="flex-start"
                                    spacing={2}
                                >
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar src={row.imageUrl} alt={row.name} sx={{ width: 36, height: 36 }}>
                                            {row.name?.[0]?.toUpperCase() ?? "P"}
                                        </Avatar>

                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body1" fontWeight={900}>
                                                {row.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                ID: {getId(row)}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Stack>

                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <StatusChip
                                        label={row.category.charAt(0).toUpperCase() + row.category.slice(1)}
                                        color="default"
                                    />
                                    <StatusChip
                                        label={connectionTypeLabel(row.connectionType)}
                                        color={connectionTypeColor(row.connectionType) as any}
                                    />
                                    <StatusChip
                                        label={row.isActive ? "Active" : "Inactive"}
                                        color={row.isActive ? "success" : "default"}
                                    />
                                    <StatusChip
                                        label={row.isSupported ? "Supported" : "Not supported"}
                                        color={row.isSupported ? "success" : "default"}
                                    />
                                </Stack>

                                <Box>{renderActions(row)}</Box>
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
                                No platforms found.
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
                <Table size="medium" stickyHeader sx={{ minWidth: 820 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 260 }}>Platform</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>Category</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>Connection type</TableCell>
                            <TableCell sx={{ minWidth: 120 }}>Active</TableCell>
                            <TableCell sx={{ minWidth: 140 }}>Supported</TableCell>
                            <TableCell sx={{ minWidth: 180 }} align="center">
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row) => (
                            <TableRow
                                key={getId(row)}
                                hover
                                sx={{
                                    "&:last-of-type td, &:last-of-type th": { borderBottom: 0 },
                                }}
                            >
                                <TableCell>
                                    <Stack direction="row" spacing={1.5} alignItems="center">
                                        <Avatar src={row.imageUrl} alt={row.name} sx={{ width: 36, height: 36 }}>
                                            {row.name?.[0]?.toUpperCase() ?? "P"}
                                        </Avatar>

                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={800} noWrap>
                                                {row.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                ID: {getId(row)}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </TableCell>

                                <TableCell>
                                    <StatusChip
                                        label={row.category.charAt(0).toUpperCase() + row.category.slice(1)}
                                        color="default"
                                    />
                                </TableCell>

                                <TableCell>
                                    <StatusChip
                                        label={connectionTypeLabel(row.connectionType)}
                                        color={connectionTypeColor(row.connectionType) as any}
                                    />
                                </TableCell>

                                <TableCell>
                                    <StatusChip
                                        label={row.isActive ? "Active" : "Inactive"}
                                        color={row.isActive ? "success" : "default"}
                                    />
                                </TableCell>

                                <TableCell>
                                    <StatusChip
                                        label={row.isSupported ? "Supported" : "Not supported"}
                                        color={row.isSupported ? "success" : "default"}
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
                                            No platforms found.
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