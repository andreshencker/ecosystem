import * as React from "react";
import {
    Avatar,
    Box,
    Button,
    Divider,
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

import StatusChip from "@/app/common/components/StatusChip";
import type { UserPlatform } from "@/modules/core/userPlatforms/api/userPlatforms";

type Props = {
    rows?: UserPlatform[];
    loading?: boolean;
    onRefresh?: () => void;

    // ✅ admin actions: solo toggle active
    onToggleActive: (row: UserPlatform) => void | Promise<void>;
};

function buildUserFullName(u?: any) {
    const parts = [
        u?.firstName,
        u?.middleName,
        u?.lastName,
        u?.secondLastName,
    ].filter(Boolean);
    return parts.join(" ").trim();
}

export default function AdminUserPlatformsTable({
                                                    rows = [],
                                                    loading,
                                                    onRefresh,
                                                    onToggleActive,
                                                }: Props) {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";
    const isSmall = useMediaQuery(theme.breakpoints.down("sm"));

    const renderPlatform = (row: UserPlatform) => (
        <Stack direction="row" spacing={1.5} alignItems="center" sx={{ minWidth: 0 }}>
            <Avatar src={row.platform?.imageUrl} sx={{ width: 34, height: 34 }}>
                {row.platform?.name?.[0]?.toUpperCase() ?? "P"}
            </Avatar>
            <Box sx={{ minWidth: 0 }}>
                <Typography variant="body2" fontWeight={800} noWrap>
                    {row.platform?.name ?? "Platform"}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap>
                    {row.platform ? `${row.platform.category} • ${row.platform.connectionType}` : ""}
                </Typography>
            </Box>
        </Stack>
    );

    const renderUser = (row: UserPlatform) => {
        const u: any = (row as any).user;
        const fullName = buildUserFullName(u);
        return (
            <Box sx={{ minWidth: 0 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
                    <Typography variant="body2" fontWeight={800} noWrap>
                        {fullName || u?.email || row.userId}
                    </Typography>
                    {u?.role ? (
                        <StatusChip
                            label={String(u.role).toUpperCase()}
                            color={u.role === "admin" ? "info" : u.role === "client" ? "default" : "warning"}
                        />
                    ) : null}
                </Stack>

                <Typography variant="caption" color="text.secondary" noWrap>
                    {u?.email ? u.email : `userId: ${row.userId}`}
                </Typography>
            </Box>
        );
    };

    const renderBadges = (row: UserPlatform) => (
        <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
            <StatusChip
                label={row.isActive ? "Active" : "Inactive"}
                color={row.isActive ? "success" : "default"}
            />
        </Stack>
    );

    const Actions = ({ row }: { row: UserPlatform }) => (
        <Stack direction="row" spacing={1} justifyContent="flex-end" alignItems="center">
            <Button
                size="small"
                variant={isDark ? "outlined" : "contained"}
                color="inherit"
                onClick={() => onToggleActive(row)}
                disabled={loading}
                sx={{ textTransform: "none", fontWeight: 800 }}
            >
                {row.isActive ? "Deactivate" : "Activate"}
            </Button>
        </Stack>
    );

    return (
        <Box>
            {/* Header */}
            <Box
                sx={{
                    mb: 1.5,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1,
                }}
            >
                <Box>
                    <Typography variant="h6" fontWeight={900}>
                        User platforms
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        Associations between users and platforms (admin view).
                    </Typography>
                </Box>

                <Tooltip title="Reload">
          <span>
            <Button
                startIcon={<RefreshRoundedIcon fontSize="small" />}
                variant="outlined"
                color="inherit"
                onClick={onRefresh}
                disabled={loading}
                sx={{ textTransform: "none", fontWeight: 800 }}
            >
              Reload
            </Button>
          </span>
                </Tooltip>
            </Box>

            {isSmall ? (
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
                                bgcolor: theme.palette.background.paper,
                            }}
                        >
                            {renderPlatform(row)}
                            <Divider sx={{ my: 1.2 }} />
                            {renderUser(row)}
                            <Divider sx={{ my: 1.2 }} />
                            {renderBadges(row)}
                            <Divider sx={{ my: 1.2 }} />
                            <Actions row={row} />
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
            ) : (
                <TableContainer
                    component={Paper}
                    sx={{ borderRadius: 3, overflowX: "auto", boxShadow: "none", border: "1px solid", borderColor: "divider" }}
                >
                    <Table size="medium" sx={{ minWidth: 920 }}>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: "35%" }}>Platform</TableCell>
                                <TableCell sx={{ width: "45%" }}>User</TableCell>
                                <TableCell sx={{ width: "10%" }}>State</TableCell>
                                <TableCell sx={{ width: "10%" }} align="right">
                                    Actions
                                </TableCell>
                            </TableRow>
                        </TableHead>

                        <TableBody>
                            {rows.map((row) => (
                                <TableRow key={row.id} hover>
                                    <TableCell>{renderPlatform(row)}</TableCell>
                                    <TableCell>{renderUser(row)}</TableCell>
                                    <TableCell>{renderBadges(row)}</TableCell>
                                    <TableCell align="right">
                                        <Actions row={row} />
                                    </TableCell>
                                </TableRow>
                            ))}

                            {rows.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={4}>
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
            )}
        </Box>
    );
}