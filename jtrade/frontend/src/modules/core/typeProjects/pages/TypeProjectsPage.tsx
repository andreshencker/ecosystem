import * as React from "react";
import {
    Box,
    CircularProgress,
    Drawer,
    Stack,
    Typography,
    useMediaQuery,
    useTheme,
} from "@mui/material";

import TypeProjectForm, {
    type TypeProjectFormValues,
} from "../components/TypeProjectForm";

import TypeProjectsTableView, {
    TYPE_PROJECTS_FILTERS_DEFAULTS,
} from "../components/TypeProjectsTableView";

import {
    useCreateTypeProject,
    useDeactivateTypeProject,
    useSeedTypeProjects,
    useTypeProjects,
    useUpdateTypeProject,
} from "../hooks/useTypeProjects";

import type {
    TypeProject,
    TypeProjectsFiltersValue,
} from "../types/typeProject";

function applyFilters(
    list: TypeProject[],
    filters: TypeProjectsFiltersValue,
): TypeProject[] {
    const search = filters.search.trim().toLowerCase();

    return list.filter((row) => {
        const haystack = `${row.name ?? ""} ${row.key ?? ""} ${row.description ?? ""}`.toLowerCase();

        if (search && !haystack.includes(search)) return false;

        if (typeof filters.isActive === "boolean") {
            if (row.isActive !== filters.isActive) return false;
        }

        return true;
    });
}

export default function TypeProjectsPage() {
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));
    const HEADER_HEIGHT = 56;

    const [filters, setFilters] = React.useState<TypeProjectsFiltersValue>(
        TYPE_PROJECTS_FILTERS_DEFAULTS,
    );

    const [editing, setEditing] = React.useState<TypeProject | null>(null);
    const [openForm, setOpenForm] = React.useState(false);

    const qTypes = useTypeProjects();
    const mCreate = useCreateTypeProject();
    const mUpdate = useUpdateTypeProject();
    const mDeactivate = useDeactivateTypeProject();
    const mSeed = useSeedTypeProjects();

    const rows = React.useMemo(() => {
        return applyFilters(qTypes.data ?? [], filters);
    }, [qTypes.data, filters]);

    const pending =
        mCreate.isPending ||
        mUpdate.isPending ||
        mDeactivate.isPending ||
        mSeed.isPending;

    const handleRefresh = () => qTypes.refetch();

    const handleClearFilters = () =>
        setFilters(TYPE_PROJECTS_FILTERS_DEFAULTS);

    const handleAdd = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleEdit = (row: TypeProject) => {
        setEditing(row);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleDeactivate = async (row: TypeProject) => {
        await mDeactivate.mutateAsync(row.id);

        if (editing?.id === row.id) {
            handleCloseForm();
        }
    };

    const handleSeed = async () => {
        await mSeed.mutateAsync();
    };

    const handleSubmit = async (values: TypeProjectFormValues) => {
        if (editing) {
            await mUpdate.mutateAsync({
                id: editing.id,
                dto: values,
            });

            handleCloseForm();
            return;
        }

        await mCreate.mutateAsync(values);
        handleCloseForm();
    };

    if (qTypes.isLoading) {
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
                    Type Projects
                </Typography>

                <Typography variant="body2" color="text.secondary">
                    Define the categories used by project code, such as bots, indicators, scripts and signal providers.
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
                <TypeProjectsTableView
                    rows={rows}
                    loading={qTypes.isFetching || pending}
                    filters={filters}
                    onFiltersChange={setFilters}
                    onClearFilters={handleClearFilters}
                    onRefresh={handleRefresh}
                    onAdd={handleAdd}
                    onSeed={handleSeed}
                    onEdit={handleEdit}
                    onDeactivate={handleDeactivate}
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
                        height: isMobile
                            ? "auto"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        minHeight: isMobile
                            ? "70vh"
                            : `calc(100vh - ${HEADER_HEIGHT}px)`,
                        borderTopLeftRadius: isMobile ? 16 : 0,
                        borderTopRightRadius: isMobile ? 16 : 0,
                        p: { xs: 1.5, sm: 2, md: 2.5 },
                        overflowY: "auto",
                        overflowX: "hidden",
                    },
                }}
            >
                <TypeProjectForm
                    initial={editing}
                    loading={pending}
                    onSubmit={handleSubmit}
                    onCancel={handleCloseForm}
                />
            </Drawer>
        </Box>
    );
}