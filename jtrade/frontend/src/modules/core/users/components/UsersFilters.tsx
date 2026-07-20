import * as React from "react";
import { Box, Button, MenuItem, Paper, Stack, TextField } from "@mui/material";
import type { UsersFiltersValue, UserRole } from "../types/user";

export const USERS_FILTERS_DEFAULTS: UsersFiltersValue = {
    search: "",
    role: "",
    isActive: null,
};

type Props = {
    value: UsersFiltersValue;
    onChange: (next: UsersFiltersValue) => void;
    onClear: () => void;
};

const ROLES: { label: string; value: UserRole }[] = [
    { label: "ADMIN", value: "ADMIN" as any },
    { label: "CLIENT", value: "CLIENT" as any },
    { label: "PROVIDER", value: "PROVIDER" as any },
];

export default function UsersFilters({ value, onChange, onClear }: Props) {
    return (
        <Paper
            elevation={0}
            sx={{
                mt: 1,
                mb: 2,
                p: { xs: 1.5, sm: 2 },
                borderRadius: 3,
                border: "1px solid",
                borderColor: "divider",
            }}
        >
            <Stack
                direction={{ xs: "column", lg: "row" }}
                spacing={2}
                alignItems={{ xs: "stretch", lg: "center" }}
            >
                <TextField
                    label="Search"
                    value={value.search}
                    onChange={(e) => onChange({ ...value, search: e.target.value })}
                    size="small"
                    placeholder="Name or email"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                        flex: { lg: 1.2 },
                        minWidth: 0,
                    }}
                />

                <TextField
                    select
                    label="Role"
                    value={value.role || ""}
                    onChange={(e) => onChange({ ...value, role: e.target.value as any })}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                        width: { lg: 200 },
                        minWidth: { lg: 200 },
                    }}
                >
                    <MenuItem value="">All</MenuItem>
                    {ROLES.map((r) => (
                        <MenuItem key={r.label} value={r.value}>
                            {r.label}
                        </MenuItem>
                    ))}
                </TextField>

                <TextField
                    select
                    label="Status"
                    value={
                        value.isActive === null ? "all" : value.isActive ? "active" : "inactive"
                    }
                    onChange={(e) => {
                        const v = e.target.value;
                        onChange({
                            ...value,
                            isActive: v === "all" ? null : v === "active",
                        });
                    }}
                    size="small"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    sx={{
                        width: { lg: 200 },
                        minWidth: { lg: 200 },
                    }}
                >
                    <MenuItem value="all">All</MenuItem>
                    <MenuItem value="active">Active</MenuItem>
                    <MenuItem value="inactive">Inactive</MenuItem>
                </TextField>

                <Button
                    variant="outlined"
                    color="inherit"
                    onClick={onClear}
                    sx={{
                        textTransform: "none",
                        fontWeight: 700,
                        minWidth: { xs: "100%", lg: 120 },
                        alignSelf: { xs: "stretch", lg: "center" },
                    }}
                >
                    Clear
                </Button>
            </Stack>
        </Paper>
    );
}