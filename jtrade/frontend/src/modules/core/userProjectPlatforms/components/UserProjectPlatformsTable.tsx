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

import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";

import StatusChip from "@/app/common/components/StatusChip";
import DeleteConfirmButton from "@/app/common/components/ConfirmDeleteButton";

import type { UserProjectPlatform } from "../types/userProjectPlatforms";

type Props = {
    rows?: UserProjectPlatform[];
    loading?: boolean;
    mode?: "client" | "admin";
    onRefresh?: () => void;
    onCreate?: () => void;
    onToggleActive?: (row: UserProjectPlatform, nextActive: boolean) => void | Promise<void>;
    onRemove?: (row: UserProjectPlatform) => void | Promise<void>;
    onDownload?: (row: UserProjectPlatform) => void | Promise<void>;
};

export default function UserProjectPlatformsTable({
                                                      rows = [],
                                                      loading = false,
                                                      mode = "client",
                                                      onRefresh,
                                                      onCreate,
                                                      onToggleActive,
                                                      onRemove,
                                                      onDownload,
                                                  }: Props) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));
    const isClient = mode === "client";

    const renderProject = (row: UserProjectPlatform) => {
        const relation = row.projectCodePlatform;
        const project = relation?.codeProject;
        const platform = relation?.platform;

        return (
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                <Avatar
                    src={platform?.imageUrl || undefined}
                    alt={platform?.name ?? "Platform"}
                    sx={{ width: 34, height: 34 }}
                >
                    {platform?.name?.charAt(0)?.toUpperCase() ?? "P"}
                </Avatar>

                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={900} noWrap>
                        {project?.name ?? "Project"}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" noWrap>
                        {platform?.name ?? "Platform"} · {project?.projectKey ?? "—"}
                    </Typography>
                </Box>
            </Stack>
        );
    };

    const renderProvider = (row: UserProjectPlatform) => {
        const provider = row.projectCodePlatform?.companyProvider;

        return (
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={800} noWrap>
                    {provider?.companyName ?? "—"}
                </Typography>

                <Typography variant="caption" color="text.secondary" noWrap>
                    {provider?.legalName ?? provider?.id ?? "—"}
                </Typography>
            </Box>
        );
    };

    const renderUser = (row: UserProjectPlatform) => (
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={800} noWrap>
                {row.user?.fullName || row.user?.email || "—"}
            </Typography>

            <Typography variant="caption" color="text.secondary" noWrap>
                {row.user?.email ?? row.userId}
            </Typography>
        </Box>
    );

    const renderAccess = (row: UserProjectPlatform) =>
        isClient ? (
            <Stack direction="row" spacing={1.25} alignItems="center">
                <Switch
                    size="small"
                    checked={!!row.isActive}
                    onChange={(_, next) => onToggleActive?.(row, next)}
                    disabled={loading || !onToggleActive}
                />

                <Typography
                    variant="body2"
                    fontWeight={700}
                    color={row.isActive ? "success.main" : "text.secondary"}
                >
                    {row.isActive ? "Active" : "Inactive"}
                </Typography>
            </Stack>
        ) : (
            <StatusChip
                label={row.isActive ? "Active" : "Inactive"}
                color={row.isActive ? "success" : "default"}
            />
        );

    const renderDates = (row: UserProjectPlatform) => (
        <Box>
            <Typography variant="body2" color="text.secondary">
                Subscribed:{" "}
                {row.subscribedAt ? new Date(row.subscribedAt).toLocaleDateString() : "—"}
            </Typography>

            <Typography variant="caption" color="text.secondary">
                Last download:{" "}
                {row.lastDownloadAt
                    ? new Date(row.lastDownloadAt).toLocaleDateString()
                    : "Never"}
            </Typography>
        </Box>
    );

    const renderActions = (row: UserProjectPlatform) => (
        <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
            {isClient && onDownload ? (
                <Button
                    size="small"
                    variant="contained"
                    color="inherit"
                    startIcon={<DownloadRoundedIcon />}
                    onClick={() => onDownload(row)}
                    disabled={loading || !row.isActive}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                >
                    Download
                </Button>
            ) : null}

            {onRemove ? (
                <DeleteConfirmButton
                    label={isClient ? "Remove" : "Delete"}
                    color="error"
                    size="small"
                    confirmTitle={isClient ? "Remove subscription" : "Delete subscription"}
                    confirmText={`Are you sure you want to remove this subscription?`}
                    description="This action cannot be undone."
                    onConfirm={() => onRemove(row)}
                    disabled={loading}
                />
            ) : null}
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
                    {isClient ? "My subscriptions" : "User subscriptions"}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    {isClient
                        ? "Manage your subscribed projects and download available files."
                        : "General view of client project subscriptions."}
                </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
                {isClient && onCreate ? (
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
                        }}
                    >
                        Subscribe
                    </Button>
                ) : null}

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

    const renderCard = (row: UserProjectPlatform) => (
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
                {renderProject(row)}
                {!isClient && renderUser(row)}
                {renderProvider(row)}

                <Stack direction="row" spacing={1} flexWrap="wrap">
                    {renderAccess(row)}
                </Stack>

                {renderDates(row)}
                {renderActions(row)}
            </Stack>
        </Paper>
    );

    if (isMobile || isTablet) {
        return (
            <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
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
                                No subscriptions found.
                            </Typography>
                        </Paper>
                    )}
                </Stack>
            </Box>
        );
    }

    return (
        <Box sx={{ height: "100%", minHeight: 0, display: "flex", flexDirection: "column" }}>
            {header}

            <TableContainer
                component={Paper}
                sx={{
                    flex: 1,
                    minHeight: 0,
                    borderRadius: 3,
                    overflow: "auto",
                    boxShadow: "none",
                    border: "1px solid",
                    borderColor: "divider",
                }}
            >
                <Table size="medium" stickyHeader sx={{ minWidth: isClient ? 1120 : 1320 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 280 }}>Project / Platform</TableCell>
                            {!isClient && <TableCell sx={{ minWidth: 240 }}>User</TableCell>}
                            <TableCell sx={{ minWidth: 240 }}>Provider</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>Access</TableCell>
                            <TableCell sx={{ minWidth: 240 }}>Dates</TableCell>
                            <TableCell sx={{ minWidth: 240 }} align="center">
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {rows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell>{renderProject(row)}</TableCell>
                                {!isClient && <TableCell>{renderUser(row)}</TableCell>}
                                <TableCell>{renderProvider(row)}</TableCell>
                                <TableCell>{renderAccess(row)}</TableCell>
                                <TableCell>{renderDates(row)}</TableCell>
                                <TableCell align="center">{renderActions(row)}</TableCell>
                            </TableRow>
                        ))}

                        {rows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={isClient ? 5 : 6}>
                                    <Box sx={{ py: 4, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No subscriptions found.
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