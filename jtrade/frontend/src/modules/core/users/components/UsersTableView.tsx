import * as React from "react";
import { Box, Button, IconButton, Stack, Tooltip, Typography } from "@mui/material";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";

import UsersFilters from "./UsersFilters";
import UsersTable from "./UsersTable";
import type { User, UsersFiltersValue } from "../types/user";

type Props = {
    title?: string;
    subtitle?: string;

    rows?: User[];
    loading?: boolean;
    onRefresh?: () => void;
    onAdd?: () => void;

    filters: UsersFiltersValue;
    onFiltersChange: (next: UsersFiltersValue) => void;
    onClearFilters: () => void;

    onEdit: (row: User) => void;
    onDelete: (row: User) => void;
    onResetPassword: (row: User) => void;
};

export default function UsersTableView({
                                           title = "Users",
                                           subtitle = "Create and manage users (roles, status and access).",
                                           rows = [],
                                           loading,
                                           onRefresh,
                                           onAdd,
                                           filters,
                                           onFiltersChange,
                                           onClearFilters,
                                           onEdit,
                                           onDelete,
                                           onResetPassword,
                                       }: Props) {
    return (
        <Box>
            <Box
                sx={{
                    mb: 1.25,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    flexWrap: "wrap",
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={800}>
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        {subtitle}
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
                            Add user
                        </Button>
                    )}

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
                </Stack>
            </Box>

            <UsersFilters value={filters} onChange={onFiltersChange} onClear={onClearFilters} />

            <UsersTable
                rows={rows}
                loading={loading}
                onEdit={onEdit}
                onDelete={onDelete}
                onResetPassword={onResetPassword}
            />
        </Box>
    );
}