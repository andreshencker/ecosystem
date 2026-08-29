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
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";

import StatusChip from "@/old/app/common/components/StatusChip";
import DeleteConfirmButton from "@/old/app/common/components/ConfirmDeleteButton";

import type { CodeProjectVersion } from "../types/codeProjectVersions";

type Props = {
    rows?: CodeProjectVersion[];
    loading?: boolean;
    mode?: "admin" | "provider";
    onRefresh?: () => void;
    onToggleActive?: (row: CodeProjectVersion, nextActive: boolean) => void | Promise<void>;
    onSetCurrent?: (row: CodeProjectVersion) => void | Promise<void>;
    onRemove?: (row: CodeProjectVersion) => void | Promise<void>;
    onCreate?: () => void;
    onEdit?: (row: CodeProjectVersion) => void | Promise<void>;
    onDownload?: (row: CodeProjectVersion) => void | Promise<void>;
};

export default function CodeProjectVersionsTable({
                                                     rows = [],
                                                     loading = false,
                                                     mode = "admin",
                                                     onRefresh,
                                                     onToggleActive,
                                                     onSetCurrent,
                                                     onRemove,
                                                     onCreate,
                                                     onEdit,
                                                     onDownload,
                                                 }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const isProvider = mode === "provider";

    const actionBtnSx = {
        textTransform: "none",
        fontWeight: 700,
        ...(isDark && {
            borderColor: "divider",
            bgcolor: "rgba(255,255,255,0.02)",
        }),
    } as const;

    const renderProjectInfo = (row: CodeProjectVersion) => (
        <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar
                src={row.platform?.imageUrl || undefined}
                alt={row.platform?.name ?? "Platform"}
                sx={{ width: 30, height: 30, fontSize: 13 }}
            >
                {row.platform?.name?.charAt(0)?.toUpperCase() ?? "P"}
            </Avatar>

            <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={900} noWrap>
                    {row.codeProject?.name ?? row.projectKey}
                </Typography>

                <Typography variant="caption" color="text.secondary" noWrap>
                    {row.platform?.name ?? "—"} · {row.projectKey}
                </Typography>
            </Box>
        </Stack>
    );

    const renderCompanyInfo = (row: CodeProjectVersion) => (
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={800} noWrap>
                {row.companyProvider?.companyName ?? "—"}
            </Typography>

            <Typography variant="caption" color="text.secondary" noWrap>
                {row.companyProviderId}
            </Typography>
        </Box>
    );

    const renderVersionInfo = (row: CodeProjectVersion) => (
        <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" fontWeight={900} noWrap>
                {row.version}
            </Typography>

            <Typography variant="caption" color="text.secondary" noWrap>
                {row.projectCodePlatform?.deliveryMode ?? "—"} ·{" "}
                {row.projectCodePlatform?.runtimeMode ?? "—"}
            </Typography>
        </Box>
    );

    const renderFileInfo = (row: CodeProjectVersion) => {
        const originalFileName = row.originalFileName?.trim();
        const storedFileName = row.fileName?.trim();

        return (
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={700} noWrap>
                    {originalFileName || storedFileName || "—"}
                </Typography>

                {storedFileName && originalFileName && originalFileName !== storedFileName ? (
                    <Typography variant="caption" color="text.secondary" noWrap>
                        Stored: {storedFileName}
                    </Typography>
                ) : (
                    <Typography variant="caption" color="text.secondary" noWrap>
                        {row.extension?.toUpperCase()} · {Math.round((row.size ?? 0) / 1024)} KB
                    </Typography>
                )}
            </Box>
        );
    };

    const renderCurrent = (row: CodeProjectVersion) =>
        row.isCurrentVersion ? (
            <StatusChip label="Current" color="success" />
        ) : isProvider ? (
            <Button
                size="small"
                variant={isDark ? "outlined" : "contained"}
                color="inherit"
                onClick={() => onSetCurrent?.(row)}
                disabled={loading || !onSetCurrent}
                sx={actionBtnSx}
            >
                Set current
            </Button>
        ) : (
            <StatusChip label="Not current" color="default" />
        );

    const renderActive = (row: CodeProjectVersion) =>
        isProvider ? (
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

    const renderActions = (row: CodeProjectVersion) => (
        <Stack
            direction="row"
            spacing={1}
            alignItems="center"
            justifyContent={{ xs: "stretch", sm: "center" }}
            flexWrap="wrap"
            useFlexGap
        >
            {isProvider && onEdit ? (
                <Button
                    size="small"
                    variant={isDark ? "outlined" : "contained"}
                    color="inherit"
                    startIcon={<EditRoundedIcon />}
                    onClick={() => onEdit(row)}
                    disabled={loading}
                    sx={actionBtnSx}
                >
                    Edit
                </Button>
            ) : null}

            {onDownload ? (
                <Button
                    size="small"
                    variant={isDark ? "outlined" : "contained"}
                    color="inherit"
                    startIcon={<DownloadRoundedIcon />}
                    onClick={() => onDownload(row)}
                    disabled={loading}
                    sx={actionBtnSx}
                >
                    Download
                </Button>
            ) : null}

            {onRemove ? (
                <DeleteConfirmButton
                    label="Delete"
                    color="error"
                    size="small"
                    confirmTitle="Delete version"
                    confirmText={`Are you sure you want to delete version "${row.version}"?`}
                    description="This action cannot be undone and will remove this uploaded version."
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
                    Code versions
                </Typography>

                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                    {isProvider
                        ? "Upload and manage your project version files."
                        : "General view of uploaded project versions."}
                </Typography>
            </Box>

            <Stack direction="row" spacing={1} alignItems="center">
                {isProvider && onCreate ? (
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
                        Upload version
                    </Button>
                ) : null}

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

    const renderCard = (row: CodeProjectVersion) => (
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
                {renderProjectInfo(row)}
                {!isProvider && renderCompanyInfo(row)}
                {renderVersionInfo(row)}
                {renderFileInfo(row)}

                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                    {renderCurrent(row)}
                    {renderActive(row)}
                </Stack>

                <Box sx={{ pt: 0.5 }}>{renderActions(row)}</Box>
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
                                No code versions found.
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
                <Table size="medium" stickyHeader sx={{ minWidth: isProvider ? 1180 : 1360 }}>
                    <TableHead>
                        <TableRow>
                            <TableCell sx={{ minWidth: 260 }}>Project / Platform</TableCell>
                            {!isProvider && <TableCell sx={{ minWidth: 240 }}>Company</TableCell>}
                            <TableCell sx={{ minWidth: 180 }}>Version</TableCell>
                            <TableCell sx={{ minWidth: 260 }}>File</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>Current</TableCell>
                            <TableCell sx={{ minWidth: 160 }}>Active</TableCell>
                            <TableCell sx={{ minWidth: 300 }} align="center">
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
                                <TableCell>{renderProjectInfo(row)}</TableCell>
                                {!isProvider && <TableCell>{renderCompanyInfo(row)}</TableCell>}
                                <TableCell>{renderVersionInfo(row)}</TableCell>
                                <TableCell>{renderFileInfo(row)}</TableCell>
                                <TableCell>{renderCurrent(row)}</TableCell>
                                <TableCell>{renderActive(row)}</TableCell>
                                <TableCell align="center">{renderActions(row)}</TableCell>
                            </TableRow>
                        ))}

                        {rows.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={isProvider ? 6 : 7}>
                                    <Box sx={{ py: 4, textAlign: "center" }}>
                                        <Typography variant="body2" color="text.secondary">
                                            No code versions found.
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