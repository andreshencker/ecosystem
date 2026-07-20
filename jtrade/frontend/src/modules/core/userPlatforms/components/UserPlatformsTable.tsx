import * as React from "react";
import {
    Avatar,
    Box,
    Button,
    Chip,
    Divider,
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
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import StarRoundedIcon from "@mui/icons-material/StarRounded";
import StarBorderRoundedIcon from "@mui/icons-material/StarBorderRounded";

import StatusChip from "@/app/common/components/StatusChip";
import type {
    UserPlatformRow,
    UserPlatformStatus,
} from "@/modules/core/userPlatforms/types/userPlatforms";

type Props = {
    rows?: UserPlatformRow[];
    loading?: boolean;
    onRefresh?: () => void;
    onManage?: (row: UserPlatformRow) => void;
    onConnection?: (row: UserPlatformRow) => void;
    onSetDefault?: (row: UserPlatformRow) => void;
    onToggleActive?: (row: UserPlatformRow, next: boolean) => void;
};

function getStatusChipProps(
    status?: UserPlatformStatus | null
): { label: string; color: "default" | "success" | "warning" | "error" | "info" } {
    switch (status) {
        case "connected":
            return { label: "Connected", color: "success" };
        case "pending":
            return { label: "Pending", color: "info" };
        case "error":
            return { label: "Error", color: "error" };
        case "disconnected":
        default:
            return { label: "Disconnected", color: "default" };
    }
}

function normalizeConnectionType(raw: any): string {
    return String(raw ?? "").trim().toLowerCase();
}

function canShowConnection(row: UserPlatformRow): boolean {
    const p: any = row.platform ?? {};
    const ct = normalizeConnectionType(p.connectionType);
    if (!ct) return false;
    return ct !== "none";
}

export default function UserPlatformsTable({
                                               rows = [],
                                               loading,
                                               onRefresh,
                                               onManage,
                                               onConnection,
                                               onSetDefault,
                                               onToggleActive,
                                           }: Props) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const renderChips = (row: UserPlatformRow) => {
        const p: any = row.platform ?? {};
        const statusProps = getStatusChipProps(row.status as any);

        return (
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                <StatusChip
                    label={p.connectionType ? String(p.connectionType).toUpperCase() : "NONE"}
                    color={String(p.connectionType).toLowerCase() === "apikey" ? "warning" : "default"}
                />

                <StatusChip label={statusProps.label} color={statusProps.color} />

                {row.isDefault && <StatusChip label="Default" color="success" />}
            </Stack>
        );
    };

    const renderActiveToggle = (row: UserPlatformRow) => {
        const isActive = Boolean((row as any).isActive);

        return (
            <Switch
                size="small"
                checked={isActive}
                disabled={loading}
                onChange={(e) => onToggleActive?.(row, e.target.checked)}
            />
        );
    };

    const renderDefaultButton = (row: UserPlatformRow) => {
        if (row.isDefault) {
            return (
                <Tooltip title="Default platform">
          <span>
            <IconButton size="small" disabled>
              <StarRoundedIcon fontSize="small" />
            </IconButton>
          </span>
                </Tooltip>
            );
        }

        if (!onSetDefault) return null;

        return (
            <Tooltip title="Set as default">
                <IconButton
                    size="small"
                    onClick={() => onSetDefault(row)}
                    disabled={loading}
                >
                    <StarBorderRoundedIcon fontSize="small" />
                </IconButton>
            </Tooltip>
        );
    };

    const renderActions = (row: UserPlatformRow) => {
        const showConnection = !!onConnection && canShowConnection(row);

        return (
            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent={{ xs: "stretch", sm: "flex-end" }}
                flexWrap="wrap"
                useFlexGap
            >
                {renderDefaultButton(row)}

                {onManage && (
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onManage(row)}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            minWidth: 96,
                        }}
                    >
                        Manage
                    </Button>
                )}

                {showConnection && (
                    <Button
                        size="small"
                        variant="contained"
                        onClick={() => onConnection(row)}
                        sx={{
                            textTransform: "none",
                            fontWeight: 700,
                            minWidth: 118,
                        }}
                    >
                        Connection
                    </Button>
                )}
            </Stack>
        );
    };

    const renderHeader = () => (
        <Box
            sx={{
                mb: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
            }}
        >
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6" fontWeight={800} noWrap>
                    Platforms
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Manage your trading platforms, connection types, active status and default platform.
                </Typography>
            </Box>

            <Tooltip title="Reload">
        <span>
          <IconButton size="small" onClick={onRefresh} disabled={loading}>
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
        </Box>
    );

    if (isMobile) {
        return (
            <Box sx={{ width: "100%" }}>
                {renderHeader()}

                <Stack spacing={1.5}>
                    {rows.map((row) => {
                        const p: any = row.platform ?? {};

                        return (
                            <Paper
                                key={row.id}
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    p: 1.5,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "background.paper",
                                    overflow: "hidden",
                                }}
                            >
                                <Stack spacing={1.25}>
                                    <Stack direction="row" spacing={1.25} alignItems="center">
                                        <Avatar
                                            src={p.imageUrl}
                                            alt={p.name}
                                            sx={{ width: 34, height: 34, flexShrink: 0 }}
                                        >
                                            {String(p.name ?? "P")[0]?.toUpperCase()}
                                        </Avatar>

                                        <Box sx={{ minWidth: 0, flex: 1 }}>
                                            <Typography variant="body2" fontWeight={900} noWrap>
                                                {p.name ?? "Unknown"}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                Link ID: {row.id}
                                            </Typography>
                                        </Box>
                                    </Stack>

                                    <Stack
                                        direction="row"
                                        alignItems="center"
                                        justifyContent="space-between"
                                        spacing={1}
                                    >
                                        <Typography variant="caption" color="text.secondary">
                                            Active
                                        </Typography>
                                        {renderActiveToggle(row)}
                                    </Stack>

                                    <Divider />

                                    {renderChips(row)}

                                    <Box>{renderActions(row)}</Box>
                                </Stack>
                            </Paper>
                        );
                    })}

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
            <Box sx={{ width: "100%" }}>
                {renderHeader()}

                <Stack spacing={1.5}>
                    {rows.map((row) => {
                        const p: any = row.platform ?? {};

                        return (
                            <Paper
                                key={row.id}
                                elevation={0}
                                sx={{
                                    borderRadius: 3,
                                    p: 2,
                                    border: "1px solid",
                                    borderColor: "divider",
                                    bgcolor: "background.paper",
                                }}
                            >
                                <Stack spacing={1.5}>
                                    <Stack
                                        direction="row"
                                        justifyContent="space-between"
                                        alignItems="flex-start"
                                        spacing={2}
                                    >
                                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                                            <Avatar src={p.imageUrl} alt={p.name} sx={{ width: 38, height: 38 }}>
                                                {String(p.name ?? "P")[0]?.toUpperCase()}
                                            </Avatar>

                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body1" fontWeight={900} noWrap>
                                                    {p.name ?? "Unknown"}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary" noWrap>
                                                    Link ID: {row.id}
                                                </Typography>
                                            </Box>
                                        </Stack>

                                        <Stack direction="row" spacing={1} alignItems="center">
                                            <Typography variant="caption" color="text.secondary">
                                                Active
                                            </Typography>
                                            {renderActiveToggle(row)}
                                        </Stack>
                                    </Stack>

                                    {renderChips(row)}

                                    <Box>{renderActions(row)}</Box>
                                </Stack>
                            </Paper>
                        );
                    })}

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
        <Box sx={{ width: "100%" }}>
            {renderHeader()}

            <TableContainer
                component={Paper}
                sx={{
                    borderRadius: 3,
                    overflowX: "auto",
                    boxShadow: "none",
                    border: "1px solid",
                    borderColor: "divider",
                    bgcolor: "background.paper",
                }}
            >
                <Table size="medium" sx={{ minWidth: 760 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 240 }}>Platform</TableCell>
                            <TableCell sx={{ minWidth: 150 }}>Connection type</TableCell>
                            <TableCell sx={{ minWidth: 130 }}>Status</TableCell>
                            <TableCell align="center" sx={{ minWidth: 90 }}>
                                Active
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 90 }}>
                                Default
                            </TableCell>
                            <TableCell align="center" sx={{ minWidth: 220 }}>
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row) => {
                            const p: any = row.platform ?? {};
                            const statusProps = getStatusChipProps(row.status as any);
                            const showConnection = !!onConnection && canShowConnection(row);

                            return (
                                <TableRow
                                    key={row.id}
                                    hover
                                    sx={{
                                        "&:last-of-type td, &:last-of-type th": { borderBottom: 0 },
                                    }}
                                >
                                    <TableCell>
                                        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
                                            <Avatar src={p.imageUrl} alt={p.name} sx={{ width: 34, height: 34 }}>
                                                {String(p.name ?? "P")[0]?.toUpperCase()}
                                            </Avatar>

                                            <Box sx={{ minWidth: 0 }}>
                                                <Typography variant="body2" fontWeight={900} noWrap>
                                                    {p.name ?? "Unknown"}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary" noWrap>
                                                    Link ID: {row.id}
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </TableCell>

                                    <TableCell>
                                        <Chip
                                            label={p.connectionType ?? "—"}
                                            size="small"
                                            color={String(p.connectionType).toLowerCase() === "apikey" ? "primary" : "default"}
                                            sx={{ textTransform: "uppercase" }}
                                        />
                                    </TableCell>

                                    <TableCell>
                                        <StatusChip label={statusProps.label} color={statusProps.color} dense />
                                    </TableCell>

                                    <TableCell align="center">
                                        {renderActiveToggle(row)}
                                    </TableCell>

                                    <TableCell align="center">
                                        {row.isDefault ? (
                                            <Tooltip title="Default platform">
                        <span>
                          <IconButton size="small" disabled>
                            <StarRoundedIcon fontSize="small" />
                          </IconButton>
                        </span>
                                            </Tooltip>
                                        ) : onSetDefault ? (
                                            <Tooltip title="Set as default">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => onSetDefault(row)}
                                                    disabled={loading}
                                                >
                                                    <StarBorderRoundedIcon fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                        ) : (
                                            <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.7 }}>
                                                —
                                            </Typography>
                                        )}
                                    </TableCell>

                                    <TableCell align="center">
                                        <Stack direction="row" spacing={1} alignItems="center" justifyContent="center">
                                            {onManage && (
                                                <Button
                                                    size="small"
                                                    variant="outlined"
                                                    onClick={() => onManage(row)}
                                                    sx={{ textTransform: "none", fontWeight: 700 }}
                                                >
                                                    Manage
                                                </Button>
                                            )}

                                            {showConnection && (
                                                <Button
                                                    size="small"
                                                    variant="contained"
                                                    onClick={() => onConnection(row)}
                                                    sx={{ textTransform: "none", fontWeight: 700 }}
                                                >
                                                    Connection
                                                </Button>
                                            )}
                                        </Stack>
                                    </TableCell>
                                </TableRow>
                            );
                        })}

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