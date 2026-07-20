// src/modules/users/components/UsersScreen.tsx
import * as React from "react";
import toast from "react-hot-toast";
import {
    Box,
    CircularProgress,
    Drawer,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import UserForm, { type UserFormValues } from "../components/UserForm";
import UsersTableView from "../components/UsersTableView";

import {
    useCreateUserAsAdmin,
    useDeleteUser,
    useUsers,
} from "../hooks/useUsers";
import type { User, UsersFiltersValue } from "../types/user";
import { USERS_FILTERS_DEFAULTS } from "../components/UsersFilters";

import { forgotPasswordApi } from "@/modules/core/auth/api/auth";

function applyFilters(list: User[], f: UsersFiltersValue): User[] {
    const search = f.search.trim().toLowerCase();

    return list.filter((u) => {
        const fullName =
            `${u.firstName ?? ""} ${u.middleName ?? ""} ${u.lastName ?? ""} ${u.secondLastName ?? ""}`.toLowerCase();
        const email = (u.email ?? "").toLowerCase();

        if (search) {
            const ok = fullName.includes(search) || email.includes(search);
            if (!ok) return false;
        }

        if (f.role) {
            const userRole = String(u.role ?? "").toUpperCase();
            const filterRole = String(f.role ?? "").toUpperCase();
            if (userRole !== filterRole) return false;
        }

        if (typeof f.isActive === "boolean") {
            if (u.isActive !== f.isActive) return false;
        }

        return true;
    });
}

export default function UsersScreen() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const [filters, setFilters] = React.useState<UsersFiltersValue>(USERS_FILTERS_DEFAULTS);
    const [editing, setEditing] = React.useState<User | null>(null);
    const [openForm, setOpenForm] = React.useState(false);

    const qUsers = useUsers();
    const mCreate = useCreateUserAsAdmin();
    const mDelete = useDeleteUser();

    const rows = React.useMemo(() => {
        const list = qUsers.data ?? [];
        return applyFilters(list, filters);
    }, [qUsers.data, filters]);

    const pending = mCreate.isPending || mDelete.isPending;

    const handleRefresh = () => qUsers.refetch();
    const handleClearFilters = () => setFilters(USERS_FILTERS_DEFAULTS);

    const handleAdd = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleEdit = (u: User) => {
        setEditing(u);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleDelete = async (u: User) => {
        await mDelete.mutateAsync(u.id);
        if (editing?.id === u.id) {
            handleCloseForm();
        }
    };

    const handleResetPassword = async (u: User) => {
        try {
            await forgotPasswordApi({ email: u.email });
            toast.success("Reset link sent (if email is registered).");
        } catch (e: any) {
            toast.error(e?.message ?? "Could not send reset link");
        }
    };

    const handleSubmit = async (values: UserFormValues) => {
        if (editing) {
            toast.error("Edit is not implemented yet (missing admin update endpoint).");
            return;
        }

        await mCreate.mutateAsync(values);
        handleCloseForm();
    };

    if (qUsers.isLoading) {
        return (
            <Box
                sx={{
                    height: "100%",
                    minHeight: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                <CircularProgress />
            </Box>
        );
    }

    return (
        <Box
            sx={{
                width: "100%",
                height: "100%",
                minHeight: 0,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                px: { xs: 1.5, sm: 2, lg: 3 },
                py: { xs: 2, sm: 3 },
                boxSizing: "border-box",
            }}
        >
            <Box sx={{ mb: 2.5, flexShrink: 0 }}>
                <Typography variant="h4" fontWeight={900} sx={{ mb: 0.5 }}>
                    Users Management
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Create and manage users, review access levels and control their active status.
                </Typography>
            </Box>

            <Box
                sx={{
                    flex: 1,
                    minHeight: 0,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                }}
            >
                <UsersTableView
                    title="Users"
                    subtitle="Create and manage users (roles, status and access)."
                    rows={rows}
                    loading={qUsers.isFetching || pending}
                    onRefresh={handleRefresh}
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClearFilters={handleClearFilters}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onResetPassword={handleResetPassword}
                    onAdd={handleAdd}
                />
            </Box>

            <Drawer
                anchor={isMobile ? "bottom" : "right"}
                open={openForm}
                onClose={handleCloseForm}
                PaperProps={{
                    sx: {
                        width: isMobile ? "100%" : { md: 620, lg: 700 },
                        maxWidth: "100%",
                        top: isMobile ? "auto" : `${HEADER_HEIGHT}px`,
                        height: isMobile ? "auto" : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        minHeight: isMobile ? "70vh" : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
                        p: { xs: 1.5, sm: 2, md: 2.5 },
                        overflowY: "auto",
                        overflowX: "hidden",
                    },
                }}
            >
                <UserForm
                    initial={editing}
                    loading={pending}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseForm}
                />
            </Drawer>
        </Box>
    );
}