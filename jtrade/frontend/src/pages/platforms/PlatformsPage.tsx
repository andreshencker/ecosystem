import * as React from "react";
import { Avatar, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { EmptyState } from "@/components/shared/EmptyState";

import PlatformForm, { PlatformFormValues } from "@/components/domain/platforms/PlatformForm";
import type { Platform } from "@/types/platforms";

import {
    useCreatePlatform,
    useDeletePlatform,
    usePlatforms,
    useUpdatePlatform,
    useUploadPlatformLogo,
} from "@/hooks/api/usePlatforms";
import { useListState } from "@/hooks/useListState";

export default function PlatformsPage() {
    const q = usePlatforms();
    const allPlatforms = q.data ?? [];

    const list = useListState();
    const statusFilter = list.filters["status"] ?? "";

    const platforms = React.useMemo(() => {
        let rows = allPlatforms;
        if (list.debouncedSearch.trim()) {
            const query = list.debouncedSearch.trim().toLowerCase();
            rows = rows.filter(
                (p) =>
                    p.key.toLowerCase().includes(query) ||
                    p.name.toLowerCase().includes(query) ||
                    p.description.toLowerCase().includes(query),
            );
        }
        if (statusFilter === "active") rows = rows.filter((p) => p.isActive);
        if (statusFilter === "inactive") rows = rows.filter((p) => !p.isActive);
        return rows;
    }, [allPlatforms, list.debouncedSearch, statusFilter]);

    const createPlatform = useCreatePlatform();
    const updatePlatform = useUpdatePlatform();
    const deletePlatform = useDeletePlatform();
    const uploadLogo = useUploadPlatformLogo();

    const [editing, setEditing] = React.useState<Platform | null>(null);
    const [openForm, setOpenForm] = React.useState(false);
    const [pendingDelete, setPendingDelete] = React.useState<Platform | null>(null);

    const saving = createPlatform.isPending || updatePlatform.isPending || uploadLogo.isPending;

    const handleAdd = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleEdit = (row: Platform) => {
        setEditing(row);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleSubmit = async (values: PlatformFormValues, logoFile: File | null) => {
        const saved = editing
            ? await updatePlatform.mutateAsync({ id: editing.id, data: values })
            : await createPlatform.mutateAsync(values);

        if (logoFile) {
            await uploadLogo.mutateAsync({ id: saved.id, file: logoFile });
        }

        handleCloseForm();
    };

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        await deletePlatform.mutateAsync(pendingDelete.id);
        setPendingDelete(null);
    };

    const columns: GridColDef<Platform>[] = [
        {
            field: "logoUrl",
            headerName: "",
            width: 64,
            sortable: false,
            renderCell: (params) => (
                <Avatar src={params.value || undefined} sx={{ width: 32, height: 32 }}>
                    {params.row.name[0]?.toUpperCase()}
                </Avatar>
            ),
        },
        { field: "key", headerName: "Key", width: 130 },
        { field: "name", headerName: "Name", flex: 1, minWidth: 160 },
        { field: "description", headerName: "Description", flex: 1.5, minWidth: 220 },
        {
            field: "isActive",
            headerName: "Active",
            width: 110,
            renderCell: (params) => (
                <Chip label={params.value ? "Active" : "Inactive"} size="small" color={params.value ? "success" : "default"} variant="outlined" />
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Platforms"
                count={allPlatforms.length}
                subtitle="Manage the trading platforms products can target (MT4, MT5, cTrader, TradingView, ...)."
                actions={
                    <LoadingButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ textTransform: "none", fontWeight: 700 }}>
                        Add platform
                    </LoadingButton>
                }
            />

            <SearchToolbar
                search={list.search}
                onSearchChange={list.setSearch}
                placeholder="Search key, name, description…"
                hasActiveFilters={list.hasActiveFilters}
                onClearFilters={list.clearFilters}
            >
                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={(e) => list.setFilter("status", e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="active">Active</MenuItem>
                        <MenuItem value="inactive">Inactive</MenuItem>
                    </Select>
                </FormControl>
            </SearchToolbar>

            <DataTable<Platform>
                columns={columns}
                rows={platforms}
                total={platforms.length}
                page={0}
                pageSize={50}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                onRowClick={handleEdit}
                rowActions={(row) => (
                    <>
                        <Tooltip title="Edit">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
                                <EditOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setPendingDelete(row); }}>
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
                emptyState={
                    list.hasActiveFilters ? (
                        <EmptyState
                            title="No platforms match your filters"
                            description="Try adjusting your search or clearing the filters."
                            action={<LoadingButton variant="outlined" onClick={list.clearFilters}>Clear filters</LoadingButton>}
                        />
                    ) : (
                        <EmptyState title="No platforms yet" description="Add MT4, MT5, cTrader or TradingView to get started." />
                    )
                }
                mobileCardConfig={{
                    primaryText: "name",
                    secondaryText: "key",
                    badge: (row) => <Chip label={row.isActive ? "Active" : "Inactive"} size="small" color={row.isActive ? "success" : "default"} />,
                    fields: [
                        { field: "description", label: "Description" },
                    ],
                }}
            />

            <FormDrawer
                open={openForm}
                onClose={handleCloseForm}
                title={editing ? "Edit platform" : "Add platform"}
                width={620}
            >
                <PlatformForm initial={editing} loading={saving} onSubmit={handleSubmit} onCancel={handleCloseForm} />
            </FormDrawer>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete platform"
                description={pendingDelete ? `This will remove "${pendingDelete.name}" from the catalogue.` : undefined}
                confirmLabel="Delete"
                danger
                loading={deletePlatform.isPending}
                onConfirm={handleConfirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
}
