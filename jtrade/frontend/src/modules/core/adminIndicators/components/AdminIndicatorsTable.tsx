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
import ContentCopyRoundedIcon from "@mui/icons-material/ContentCopyRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import toast from "react-hot-toast";

import type { AdminIndicator } from "../types/adminIndicators";

type Props = {
    rows?: AdminIndicator[] | null;
    loading?: boolean;
    onRefresh?: () => void;
    onAdd?: () => void;
    onToggleActive?: (row: AdminIndicator, next: boolean) => void | Promise<void>;
    onDelete?: (row: AdminIndicator) => void | Promise<void>;
};

export default function AdminIndicatorsTable({
                                                 rows = [],
                                                 loading,
                                                 onRefresh,
                                                 onAdd,
                                                 onToggleActive,
                                                 onDelete,
                                             }: Props) {
    const theme = useTheme();

    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const safeRows = Array.isArray(rows) ? rows : [];

    const copy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast.success("Copied");
        } catch {
            toast.error("Could not copy");
        }
    };

    const getProject = (row: AdminIndicator) =>
        row.indicatorProject?.projectCodePlatform?.codeProject;

    const getPlatform = (row: AdminIndicator) =>
        row.indicatorProject?.projectCodePlatform?.platform;

    const getIndicator = (row: AdminIndicator) =>
        row.indicatorProject?.indicator;

    const handleDelete = async (row: AdminIndicator) => {
        const ok = window.confirm(
            "Are you sure you want to delete this webhook?",
        );

        if (!ok) return;

        await onDelete?.(row);
    };

    const renderProjectPlatformCell = (row: AdminIndicator) => {
        const project = getProject(row);
        const platform = getPlatform(row);

        const projectName = project?.name ?? "Project";
        const platformName = platform?.name ?? "Platform";
        const imageUrl = platform?.imageUrl;

        return (
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Avatar src={imageUrl} sx={{ width: 34, height: 34 }}>
                    {(platformName?.[0] ?? "P").toUpperCase()}
                </Avatar>

                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={900} noWrap>
                        {projectName}
                    </Typography>

                    <Typography variant="caption" color="text.secondary" noWrap>
                        {platformName} ·{" "}
                        {row.indicatorProject?.projectCodePlatform?.runtimeMode ??
                            "-"}
                    </Typography>
                </Box>
            </Stack>
        );
    };

    const renderIndicatorCell = (row: AdminIndicator) => {
        const indicator = getIndicator(row);
        const label = indicator?.key ?? indicator?.name ?? "Indicator";

        return (
            <Typography variant="body2" fontWeight={900} noWrap>
                {label}
            </Typography>
        );
    };

    const renderWebhookCell = (row: AdminIndicator) => {
        const text = row.webhookKey?.trim() ?? "";

        return (
            <Stack
                direction="row"
                spacing={1}
                alignItems="center"
                justifyContent="flex-end"
            >
                <Box
                    sx={{
                        maxWidth: 520,
                        px: 1.25,
                        py: 0.75,
                        borderRadius: 2,
                        border: "1px solid",
                        borderColor: "divider",
                        bgcolor: "background.paper",
                        overflow: "hidden",
                    }}
                    title={text || "—"}
                >
                    <Typography
                        variant="body2"
                        sx={{
                            fontFamily:
                                "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace",
                            fontSize: 13,
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            opacity: text ? 1 : 0.6,
                        }}
                    >
                        {text || "—"}
                    </Typography>
                </Box>

                <Tooltip title={text ? "Copy" : "No webhook"}>
                    <span>
                        <IconButton
                            size="small"
                            onClick={() => text && copy(text)}
                            disabled={!text || !!loading}
                        >
                            <ContentCopyRoundedIcon fontSize="small" />
                        </IconButton>
                    </span>
                </Tooltip>
            </Stack>
        );
    };

    const renderActiveCell = (row: AdminIndicator) => (
        <Stack direction="row" alignItems="center" spacing={1.25}>
            <Switch
                checked={!!row.isActive}
                onChange={(e) => onToggleActive?.(row, e.target.checked)}
                disabled={!!loading}
            />

            <Typography variant="body2" fontWeight={900}>
                {row.isActive ? "Active" : "Inactive"}
            </Typography>
        </Stack>
    );

    const renderActionsCell = (row: AdminIndicator) => (
        <Tooltip title="Delete webhook">
            <span>
                <IconButton
                    size="small"
                    color="error"
                    onClick={() => handleDelete(row)}
                    disabled={!!loading || !onDelete}
                    sx={{
                        border: "1px solid",
                        borderColor: "divider",
                    }}
                >
                    <DeleteOutlineRoundedIcon fontSize="small" />
                </IconButton>
            </span>
        </Tooltip>
    );

    const Header = (
        <Box
            sx={{
                mb: 1.5,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                flexWrap: "wrap",
            }}
        >
            <Box>
                <Typography variant="h6" fontWeight={900}>
                    Webhooks
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    Webhook credentials per indicator project.
                </Typography>
            </Box>

            <Stack direction="row" spacing={1}>
                {onAdd && (
                    <Button
                        startIcon={<AddRoundedIcon fontSize="small" />}
                        variant="contained"
                        onClick={onAdd}
                        disabled={!!loading}
                        sx={{
                            textTransform: "none",
                            fontWeight: 900,
                            borderRadius: 999,
                        }}
                    >
                        Add webhook
                    </Button>
                )}

                <Tooltip title="Reload">
                    <span>
                        <Button
                            startIcon={<RefreshRoundedIcon fontSize="small" />}
                            variant="outlined"
                            color="inherit"
                            onClick={onRefresh}
                            disabled={!!loading}
                            sx={{
                                textTransform: "none",
                                fontWeight: 900,
                                borderRadius: 999,
                            }}
                        >
                            Reload
                        </Button>
                    </span>
                </Tooltip>
            </Stack>
        </Box>
    );

    if (isSmall || isTablet) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                {Header}

                <Stack spacing={1.5} sx={{ overflowY: "auto", minHeight: 0 }}>
                    {safeRows.map((row) => (
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
                            {renderProjectPlatformCell(row)}

                            <Box sx={{ mt: 1.2 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Indicator
                                </Typography>

                                {renderIndicatorCell(row)}
                            </Box>

                            <Box sx={{ mt: 1.2 }}>
                                <Typography variant="caption" color="text.secondary">
                                    Webhook
                                </Typography>

                                <Box sx={{ mt: 0.6 }}>
                                    {renderWebhookCell(row)}
                                </Box>
                            </Box>

                            <Box sx={{ mt: 1.2 }}>
                                {renderActiveCell(row)}
                            </Box>

                            <Stack
                                direction="row"
                                justifyContent="flex-end"
                                sx={{ mt: 1.2 }}
                            >
                                <Button
                                    size="small"
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteOutlineRoundedIcon />}
                                    onClick={() => handleDelete(row)}
                                    disabled={!!loading || !onDelete}
                                    sx={{
                                        textTransform: "none",
                                        fontWeight: 800,
                                        borderRadius: 3,
                                    }}
                                >
                                    Delete
                                </Button>
                            </Stack>
                        </Paper>
                    ))}

                    {safeRows.length === 0 && !loading && (
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
                                No webhooks found.
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
            {Header}

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
                            <TableCell sx={{ width: "30%" }}>
                                Project / Platform
                            </TableCell>

                            <TableCell sx={{ width: "16%" }}>
                                Indicator
                            </TableCell>

                            <TableCell sx={{ width: "32%" }} align="right">
                                Webhook
                            </TableCell>

                            <TableCell sx={{ width: "14%" }}>
                                Active
                            </TableCell>

                            <TableCell sx={{ width: "8%" }} align="right">
                                Actions
                            </TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {safeRows.map((row) => (
                            <TableRow key={row.id} hover>
                                <TableCell>
                                    {renderProjectPlatformCell(row)}
                                </TableCell>

                                <TableCell>
                                    {renderIndicatorCell(row)}
                                </TableCell>

                                <TableCell align="right">
                                    {renderWebhookCell(row)}
                                </TableCell>

                                <TableCell>
                                    {renderActiveCell(row)}
                                </TableCell>

                                <TableCell align="right">
                                    {renderActionsCell(row)}
                                </TableCell>
                            </TableRow>
                        ))}

                        {safeRows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={5}>
                                    <Box sx={{ py: 4, textAlign: "center" }}>
                                        <Typography
                                            variant="body2"
                                            color="text.secondary"
                                        >
                                            No webhooks found.
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