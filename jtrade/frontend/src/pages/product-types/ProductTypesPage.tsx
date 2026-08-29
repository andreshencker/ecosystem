import * as React from "react";
import { Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip } from "@mui/material";
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

import ProductTypeForm, { ProductTypeFormValues } from "@/components/domain/product-types/ProductTypeForm";
import type { ProductType } from "@/types/productTypes";

import {
    useCreateProductType,
    useDeleteProductType,
    useProductTypes,
    useUpdateProductType,
} from "@/hooks/api/useProductTypes";
import { useListState } from "@/hooks/useListState";

export default function ProductTypesPage() {
    const q = useProductTypes();
    const allProductTypes = q.data ?? [];

    const list = useListState();
    const statusFilter = list.filters["status"] ?? "";

    const productTypes = React.useMemo(() => {
        let rows = allProductTypes;
        if (list.debouncedSearch.trim()) {
            const query = list.debouncedSearch.trim().toLowerCase();
            rows = rows.filter(
                (p) =>
                    p.key.toLowerCase().includes(query) ||
                    p.name.toLowerCase().includes(query) ||
                    (p.description ?? "").toLowerCase().includes(query),
            );
        }
        if (statusFilter === "active") rows = rows.filter((p) => p.isActive);
        if (statusFilter === "inactive") rows = rows.filter((p) => !p.isActive);
        return rows;
    }, [allProductTypes, list.debouncedSearch, statusFilter]);

    const createProductType = useCreateProductType();
    const updateProductType = useUpdateProductType();
    const deleteProductType = useDeleteProductType();

    const [editing, setEditing] = React.useState<ProductType | null>(null);
    const [openForm, setOpenForm] = React.useState(false);
    const [pendingDelete, setPendingDelete] = React.useState<ProductType | null>(null);

    const saving = createProductType.isPending || updateProductType.isPending;

    const handleAdd = () => {
        setEditing(null);
        setOpenForm(true);
    };

    const handleEdit = (row: ProductType) => {
        setEditing(row);
        setOpenForm(true);
    };

    const handleCloseForm = () => {
        setEditing(null);
        setOpenForm(false);
    };

    const handleSubmit = async (values: ProductTypeFormValues) => {
        if (editing) {
            await updateProductType.mutateAsync({ id: editing.id, data: values });
        } else {
            await createProductType.mutateAsync(values);
        }
        handleCloseForm();
    };

    const handleConfirmDelete = async () => {
        if (!pendingDelete) return;
        await deleteProductType.mutateAsync(pendingDelete.id);
        setPendingDelete(null);
    };

    const columns: GridColDef<ProductType>[] = [
        { field: "key", headerName: "Key", width: 150 },
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
                title="Product Types"
                count={allProductTypes.length}
                subtitle="Define the categories providers can classify their products under (Bots, Signals, ...)."
                actions={
                    <LoadingButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ textTransform: "none", fontWeight: 700 }}>
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
                rows={productTypes}
                total={productTypes.length}
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
                            title="No product types match your filters"
                            description="Try adjusting your search or clearing the filters."
                            action={<LoadingButton variant="outlined" onClick={list.clearFilters}>Clear filters</LoadingButton>}
                        />
                    ) : (
                        <EmptyState title="No product types yet" description="Add a category such as Bots or Signals to get started." />
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
                title={editing ? "Edit product type" : "Add product type"}
                width={620}
            >
                <ProductTypeForm initial={editing} loading={saving} onSubmit={handleSubmit} onCancel={handleCloseForm} />
            </FormDrawer>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete product type"
                description={pendingDelete ? `This will remove "${pendingDelete.name}" from the catalogue.` : undefined}
                confirmLabel="Delete"
                danger
                loading={deleteProductType.isPending}
                onConfirm={handleConfirmDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
}
