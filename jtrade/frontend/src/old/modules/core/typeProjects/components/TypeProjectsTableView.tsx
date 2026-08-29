import * as React from "react";
import {
    Box,
    Button,
    IconButton,
    MenuItem,
    Paper,
    Stack,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";

import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";

import TypeProjectsTable from "./TypeProjectsTable";
import type { TypeProject, TypeProjectsFiltersValue } from "../types/typeProject";

type Props = {
    rows?: TypeProject[];
    loading?: boolean;

    filters: TypeProjectsFiltersValue;
    onFiltersChange: (next: TypeProjectsFiltersValue) => void;
    onClearFilters: () => void;

    onRefresh?: () => void;
    onAdd?: () => void;
    onSeed?: () => void;

    onEdit: (row: TypeProject) => void;
    onDeactivate: (row: TypeProject) => void;
};

export const TYPE_PROJECTS_FILTERS_DEFAULTS: TypeProjectsFiltersValue = {
    search: "",
    isActive: null,
};

export default function TypeProjectsTableView({
                                                  rows = [],
                                                  loading,
                                                  filters,
                                                  onFiltersChange,
                                                  onClearFilters,
                                                  onRefresh,
                                                  onAdd,
                                                  onSeed,
                                                  onEdit,
                                                  onDeactivate,
                                              }: Props) {
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
            <Box
                sx={{
                    mb: 1.25,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 1.5,
                    flexWrap: "wrap",
                    flexShrink: 0,
                }}
            >
                <Box sx={{ minWidth: 0 }}>
                    <Typography variant="h6" fontWeight={800}>
                        Type Projects
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                        Manage project classifications for the provider marketplace.
                    </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                    {onSeed && (
                        <Button
                            variant="outlined"
                            color="inherit"
                            startIcon={<AutoFixHighRoundedIcon />}
                            onClick={onSeed}
                            disabled={loading}
                            sx={{ textTransform: "none", fontWeight: 800 }}
                        >
                            Seed defaults
                        </Button>
                    )}

                    {onAdd && (
                        <Button
                            variant="contained"
                            startIcon={<AddRoundedIcon />}
                            onClick={onAdd}
                            disabled={loading}
                            sx={{ textTransform: "none", fontWeight: 800 }}
                        >
                            Add type
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

            <Paper
                elevation={0}
                sx={{
                    mb: 2,
                    p: { xs: 1.5, sm: 2 },
                    borderRadius: 3,
                    border: "1px solid",
                    borderColor: "divider",
                    flexShrink: 0,
                }}
            >
                <Stack
                    direction={{ xs: "column", lg: "row" }}
                    spacing={2}
                    alignItems={{ xs: "stretch", lg: "center" }}
                >
                    <TextField
                        label="Search"
                        value={filters.search}
                        onChange={(e) =>
                            onFiltersChange({
                                ...filters,
                                search: e.target.value,
                            })
                        }
                        size="small"
                        placeholder="Name, key or description"
                        fullWidth
                        InputLabelProps={{ shrink: true }}
                        sx={{ flex: { lg: 1.2 }, minWidth: 0 }}
                    />

                    <TextField
                        select
                        label="Status"
                        value={
                            filters.isActive === null
                                ? "all"
                                : filters.isActive
                                    ? "active"
                                    : "inactive"
                        }
                        onChange={(e) => {
                            const v = e.target.value;

                            onFiltersChange({
                                ...filters,
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
                        onClick={onClearFilters}
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

            <Box sx={{ flex: 1, minHeight: 0, overflow: "hidden" }}>
                <TypeProjectsTable
                    rows={rows}
                    loading={loading}
                    onEdit={onEdit}
                    onDeactivate={onDeactivate}
                />
            </Box>
        </Box>
    );
}