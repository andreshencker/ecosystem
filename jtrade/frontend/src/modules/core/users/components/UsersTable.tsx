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

import type { User } from "../types/user";

type Props = {
    rows?: User[];
    loading?: boolean;
    onEdit: (row: User) => void;
    onDelete: (row: User) => void;
    onResetPassword: (row: User) => void;
};

function getUserFullName(u: User) {
    return `${u.firstName ?? ""} ${u.middleName ? `${u.middleName} ` : ""}${u.lastName ?? ""} ${u.secondLastName ?? ""}`
        .replace(/\s+/g, " ")
        .trim();
}

export default function UsersTable({
                                       rows = [],
                                       loading,
                                       onEdit,
                                       onDelete,
                                       onResetPassword,
                                   }: Props) {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
    const isTablet = useMediaQuery(theme.breakpoints.between("sm", "lg"));

    const renderActions = (row: User) => (
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
                variant="outlined"
                color="inherit"
                onClick={() => onResetPassword(row)}
                sx={{ textTransform: "none", fontWeight: 700 }}
            >
                Reset password
            </Button>

            <Button
                size="small"
                variant="contained"
                color="inherit"
                onClick={() => onEdit(row)}
                sx={{ textTransform: "none", fontWeight: 700 }}
            >
                Edit
            </Button>

            <DeleteConfirmButton
                label="Delete"
                color="error"
                size="small"
                confirmTitle="Delete user"
                confirmText={`Are you sure you want to delete "${row.email}"?`}
                description="This action cannot be undone."
                onConfirm={() => onDelete(row)}
            />
        </Stack>
    );

    if (isMobile) {
        return (
            <Stack spacing={1.5}>
                {rows.map((u) => (
                    <Paper
                        key={u.id}
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
                                <Typography variant="body2" fontWeight={900} noWrap>
                                    {getUserFullName(u)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    {u.email}
                                </Typography>
                            </Box>

                            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                <StatusChip
                                    label={u.role}
                                    color={u.role === "ADMIN" ? "warning" : "default"}
                                />
                                <StatusChip
                                    label={u.isActive ? "Active" : "Inactive"}
                                    color={u.isActive ? "success" : "default"}
                                />
                                {typeof u.emailVerified === "boolean" && (
                                    <StatusChip
                                        label={u.emailVerified ? "Email verified" : "Email not verified"}
                                        color={u.emailVerified ? "success" : "default"}
                                    />
                                )}
                            </Stack>

                            <Box sx={{ pt: 0.5 }}>{renderActions(u)}</Box>
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
                            No users found.
                        </Typography>
                    </Paper>
                )}
            </Stack>
        );
    }

    if (isTablet) {
        return (
            <Stack spacing={1.5}>
                {rows.map((u) => (
                    <Paper
                        key={u.id}
                        elevation={0}
                        sx={{
                            borderRadius: 3,
                            p: 2,
                            border: "1px solid",
                            borderColor: "divider",
                        }}
                    >
                        <Stack spacing={1.4}>
                            <Stack
                                direction="row"
                                justifyContent="space-between"
                                alignItems="flex-start"
                                spacing={2}
                            >
                                <Box sx={{ minWidth: 0 }}>
                                    <Typography variant="body1" fontWeight={900}>
                                        {getUserFullName(u)}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {u.email}
                                    </Typography>
                                </Box>

                                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                                    <StatusChip
                                        label={u.role}
                                        color={u.role === "ADMIN" ? "warning" : "default"}
                                    />
                                    <StatusChip
                                        label={u.isActive ? "Active" : "Inactive"}
                                        color={u.isActive ? "success" : "default"}
                                    />
                                </Stack>
                            </Stack>

                            {typeof u.emailVerified === "boolean" && (
                                <Typography variant="body2" color="text.secondary">
                                    Email: {u.emailVerified ? "Verified" : "Not verified"}
                                </Typography>
                            )}

                            <Box>{renderActions(u)}</Box>
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
                            No users found.
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
            <Table
                size="medium"
                stickyHeader
                sx={{ minWidth: 1080 }}
            >
                <TableHead>
                    <TableRow>
                        <TableCell sx={{ minWidth: 260 }}>User</TableCell>
                        <TableCell sx={{ minWidth: 240 }}>Email</TableCell>
                        <TableCell sx={{ minWidth: 120 }}>Role</TableCell>
                        <TableCell sx={{ minWidth: 200 }}>Status</TableCell>
                        <TableCell align="center" sx={{ minWidth: 240 }}>
                            Actions
                        </TableCell>
                    </TableRow>
                </TableHead>

                <TableBody>
                    {rows.map((u) => (
                        <TableRow key={u.id} hover>
                            <TableCell>
                                <Typography variant="body2" fontWeight={900} noWrap>
                                    {getUserFullName(u)}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                    ID: {u.id}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <Typography variant="body2" fontWeight={700} noWrap>
                                    {u.email}
                                </Typography>
                            </TableCell>

                            <TableCell>
                                <StatusChip
                                    label={u.role}
                                    color={u.role === "ADMIN" ? "warning" : "default"}
                                />
                            </TableCell>

                            <TableCell>
                                <Stack direction="row" spacing={1} alignItems="center" useFlexGap flexWrap="wrap">
                                    <StatusChip
                                        label={u.isActive ? "Active" : "Inactive"}
                                        color={u.isActive ? "success" : "default"}
                                    />
                                    {typeof u.emailVerified === "boolean" && (
                                        <StatusChip
                                            label={u.emailVerified ? "Verified" : "Not verified"}
                                            color={u.emailVerified ? "success" : "default"}
                                        />
                                    )}
                                </Stack>
                            </TableCell>

                            <TableCell align="center">{renderActions(u)}</TableCell>
                        </TableRow>
                    ))}

                    {rows.length === 0 && !loading && (
                        <TableRow>
                            <TableCell colSpan={5}>
                                <Box sx={{ py: 4, textAlign: "center" }}>
                                    <Typography variant="body2" color="text.secondary">
                                        No users found.
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