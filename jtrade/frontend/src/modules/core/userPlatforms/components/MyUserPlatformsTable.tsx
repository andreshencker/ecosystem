import * as React from "react";
import {
    Avatar,
    Box,
    Button,
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
import { useNavigate } from "react-router-dom";

import type { UserPlatform } from "@/modules/core/userPlatforms/types/userPlatforms";

type Props = {
    rows?: UserPlatform[];
    loading?: boolean;
    onRefresh?: () => void;
    onToggleActive?: (row: UserPlatform, nextActive: boolean) => void | Promise<void>;
    webhookPath?: string;
    onGetWebhook?: (row: UserPlatform) => void;
};

function getId(row: any) {
    return String(row?.id ?? row?._id ?? "");
}

export default function AdminUserPlatformsTable({
                                                    rows = [],
                                                    loading = false,
                                                    onRefresh,
                                                    onToggleActive,
                                                    webhookPath = "/administration/webhook",
                                                    onGetWebhook,
                                                }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));
    const navigate = useNavigate();

    const goWebhook = (row: UserPlatform) => {
        if (onGetWebhook) return onGetWebhook(row);
        const id = getId(row);
        navigate(`${webhookPath}?userPlatformId=${encodeURIComponent(id)}`);
    };

    const renderPlatformCell = (row: UserPlatform) => (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar src={row.platform?.imageUrl} sx={{ width: 36, height: 36 }}>
                {row.platform?.name?.[0]?.toUpperCase() ?? "P"}
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={800} noWrap>
                    {row.platform?.name ?? row.platformId ?? "Platform"}
                </Typography>

                <Typography variant="caption" color="text.secondary" noWrap>
                    ID: {getId(row)}
                </Typography>
            </Box>
        </Stack>
    );

    const renderActiveCell = (row: UserPlatform) => {
        const checked = !!row.isActive;

        return (
            <Stack direction="row" spacing={1.25} alignItems="center" justifyContent="flex-start">
                <Switch
                    size="small"
                    checked={checked}
                    onChange={(_, next) => onToggleActive?.(row, next)}
                    disabled={loading || !onToggleActive}
                />
                <Typography
                    variant="body2"
                    fontWeight={700}
                    color={checked ? "success.main" : "text.secondary"}
                >
                    {checked ? "Active" : "Inactive"}
                </Typography>
            </Stack>
        );
    };

    const renderWebhookCell = (row: UserPlatform) => (
        <Button
            size="small"
            variant={isDark ? "outlined" : "contained"}
            color="inherit"
            onClick={() => goWebhook(row)}
            disabled={loading}
            sx={{
                textTransform: "none",
                fontWeight: 800,
                px: 2,
                borderRadius: 999,
                ...(isDark && {
                    borderColor: "divider",
                    bgcolor: "rgba(255,255,255,0.02)",
                }),
            }}
        >
            Get webhook
        </Button>
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
                    User platforms
                </Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Associations between users and platforms.
                </Typography>
            </Box>

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
                                {renderPlatformCell(row)}

                                <Box>{renderActiveCell(row)}</Box>

                                <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
                                    {renderWebhookCell(row)}
                                </Box>
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
                                No user-platforms found.
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
                                {renderPlatformCell(row)}
                                <Box>{renderActiveCell(row)}</Box>
                                <Box>{renderWebhookCell(row)}</Box>
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
                                No user-platforms found.
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
                <Table size="medium" stickyHeader sx={{ minWidth: 980 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 420 }}>Platform</TableCell>
                            <TableCell sx={{ minWidth: 220 }}>Active</TableCell>
                            <TableCell sx={{ minWidth: 200 }} align="right">
                                Webhook
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={getId(row)} hover>
                                <TableCell>{renderPlatformCell(row)}</TableCell>
                                <TableCell>{renderActiveCell(row)}</TableCell>
                                <TableCell align="right">{renderWebhookCell(row)}</TableCell>
                            </TableRow>
                        ))}

                        {rows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={3}>
                                    <Box sx={{ py: 4, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No user-platforms found.
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