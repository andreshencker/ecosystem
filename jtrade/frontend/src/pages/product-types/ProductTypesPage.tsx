import * as React from "react";
import { Avatar, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ArrowUpwardRoundedIcon from "@mui/icons-material/ArrowUpwardRounded";
import ArrowDownwardRoundedIcon from "@mui/icons-material/ArrowDownwardRounded";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { EmptyState } from "@/components/shared/EmptyState";

import ProductTypeForm, { type ProductTypeFormValues } from "@/components/domain/product-types/ProductTypeForm";
import type { ProductType } from "@/types/productTypes";

type SubmitValues = Omit<ProductTypeFormValues, "key"> & { key?: string };

import {
    useCreateProductType,
    useDeleteProductType,
    useProductTypes,
    useReorderProductTypes,
    useUpdateProductType,
} from "@/hooks/api/useProductTypes";
import { useListState } from "@/hooks/useListState";

export default function ProductTypesPage() {
    const q = useProductTypes();
    const all = React.useMemo(
        () => [...(q.data ?? [])].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name)),
        [q.data],
    );

    const list = useListState();
    const statusFilter = list.filters["status"] ?? "";
    const isFiltering = !!list.debouncedSearch.trim() || !!statusFilter;

    const rows = React.useMemo(() => {
        let r = all;
        const query = list.debouncedSearch.trim().toLowerCase();
        if (query) {
            r = r.filter((p) =>
                p.key.toLowerCase().includes(query) ||
                p.name.toLowerCase().includes(query) ||
                (p.shortDescription ?? "").toLowerCase().includes(query),
            );
        }
        if (statusFilter === "active") r = r.filter((p) => p.isActive);
        if (statusFilter === "inactive") r = r.filter((p) => !p.isActive);
        return r;
    }, [all, list.debouncedSearch, statusFilter]);

    const create = useCreateProductType();
    const update = useUpdateProductType();
    const remove = useDeleteProductType();
    const reorder = useReorderProductTypes();

    const [editing, setEditing] = React.useState<ProductType | null>(null);
    const [openForm, setOpenForm] = React.useState(false);
    const [pendingDelete, setPendingDelete] = React.useState<ProductType | null>(null);

    const saving = create.isPending || update.isPending;

    const move = (index: number, dir: -1 | 1) => {
        const next = [...all];
        const target = index + dir;
        if (target < 0 || target >= next.length) return;
        [next[index], next[target]] = [next[target], next[index]];
        reorder.mutate(next.map((t) => t.id));
    };

    const handleSubmit = async (values: SubmitValues) => {
        if (editing) {
            const { key: _key, ...data } = values;
            await update.mutateAsync({ id: editing.id, data });
        } else {
            await create.mutateAsync({ ...values, key: values.key ?? "" });
        }
        setOpenForm(false);
        setEditing(null);
    };

    const columns: GridColDef<ProductType>[] = [
        {
            field: "name", headerName: "Type", flex: 1, minWidth: 200, sortable: false,
            renderCell: (p) => (
                <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0 }}>
                    <Avatar src={p.row.iconUrl || undefined} variant="rounded" sx={{ width: 30, height: 30, bgcolor: "action.hover" }}>
                        <CategoryOutlinedIcon fontSize="small" sx={{ color: "text.disabled" }} />
                    </Avatar>
                    <Stack sx={{ minWidth: 0 }}>
                        <span style={{ fontWeight: 700 }}>{p.row.name}</span>
                        <span style={{ fontSize: 12, opacity: 0.6, fontFamily: "monospace" }}>{p.row.key}</span>
                    </Stack>
                </Stack>
            ),
        },
        { field: "shortDescription", headerName: "Short description", flex: 1.4, minWidth: 220, sortable: false },
        { field: "displayOrder", headerName: "Order", width: 90 },
        {
            field: "isActive", headerName: "Active", width: 110, sortable: false,
            renderCell: (p) => (
                <Chip label={p.value ? "Active" : "Inactive"} size="small" color={p.value ? "success" : "default"} variant="outlined" />
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Product Types"
                count={all.length}
                subtitle="The official catalogue of product kinds (Bot, Signal, …). Only admins manage this; providers pick one active type before creating a product."
                actions={
                    <LoadingButton variant="contained" startIcon={<AddIcon />} onClick={() => { setEditing(null); setOpenForm(true); }} sx={{ textTransform: "none", fontWeight: 700 }}>
                        Add type
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

            <DataTable<ProductType>
                columns={columns}
                rows={rows}
                total={rows.length}
                page={0}
                pageSize={50}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                getRowId={(row) => row.id}
                onRowClick={(row) => { setEditing(row); setOpenForm(true); }}
                rowActions={(row) => {
                    const idx = all.findIndex((t) => t.id === row.id);
                    return (
                        <>
                            <Tooltip title={isFiltering ? "Clear filters to reorder" : "Move up"}>
                                <span>
                                    <IconButton size="small" disabled={isFiltering || idx <= 0 || reorder.isPending}
                                        onClick={(e) => { e.stopPropagation(); move(idx, -1); }}>
                                        <ArrowUpwardRoundedIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title={isFiltering ? "Clear filters to reorder" : "Move down"}>
                                <span>
                                    <IconButton size="small" disabled={isFiltering || idx >= all.length - 1 || reorder.isPending}
                                        onClick={(e) => { e.stopPropagation(); move(idx, 1); }}>
                                        <ArrowDownwardRoundedIcon fontSize="small" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title="Edit">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditing(row); setOpenForm(true); }}>
                                    <EditOutlinedIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete (only if unused)">
                                <IconButton size="small" onClick={(e) => { e.stopPropagation(); setPendingDelete(row); }}>
                                    <DeleteOutlineIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        </>
                    );
                }}
                emptyState={
                    list.hasActiveFilters ? (
                        <EmptyState title="No types match your filters"
                            action={<LoadingButton variant="outlined" onClick={list.clearFilters}>Clear filters</LoadingButton>} />
                    ) : (
                        <EmptyState title="No product types yet" description="Add a kind such as Bot or Signal to get started." />
                    )
                }
                mobileCardConfig={{
                    primaryText: "name",
                    secondaryText: "key",
                    badge: (row) => <Chip label={row.isActive ? "Active" : "Inactive"} size="small" color={row.isActive ? "success" : "default"} />,
                    fields: [{ field: "shortDescription", label: "Short" }, { field: "displayOrder", label: "Order" }],
                }}
            />

            <FormDrawer open={openForm} onClose={() => { setOpenForm(false); setEditing(null); }} title={editing ? "Edit product type" : "Add product type"} width={640}>
                <ProductTypeForm initial={editing} loading={saving} onSubmit={handleSubmit} onCancel={() => { setOpenForm(false); setEditing(null); }} />
            </FormDrawer>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete product type"
                description={pendingDelete ? `Permanently delete "${pendingDelete.name}". This is blocked if any product uses it — deactivate it instead.` : undefined}
                confirmLabel="Delete"
                danger
                loading={remove.isPending}
                onConfirm={async () => { if (pendingDelete) { await remove.mutateAsync(pendingDelete.id).catch(() => {}); setPendingDelete(null); } }}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
}
