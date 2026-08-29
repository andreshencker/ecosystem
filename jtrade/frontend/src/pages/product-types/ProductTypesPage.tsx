import * as React from "react";
import { Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import AutoFixHighRoundedIcon from "@mui/icons-material/AutoFixHighRounded";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

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
    useDeactivateProductType,
    useProductTypes,
    useSeedProductTypes,
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
    const deactivateProductType = useDeactivateProductType();
    const seedProductTypes = useSeedProductTypes();

    const [editing, setEditing] = React.useState<ProductType | null>(null);
    const [openForm, setOpenForm] = React.useState(false);
    const [pendingDeactivate, setPendingDeactivate] = React.useState<ProductType | null>(null);

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

    const handleConfirmDeactivate = async () => {
        if (!pendingDeactivate) return;
        await deactivateProductType.mutateAsync(pendingDeactivate.id);
        setPendingDeactivate(null);
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
                    <>
                        <LoadingButton
                            variant="outlined"
                            color="inherit"
                            startIcon={<AutoFixHighRoundedIcon />}
                            onClick={() => seedProductTypes.mutate()}
                            loading={seedProductTypes.isPending}
                            sx={{ textTransform: "none", fontWeight: 700, mr: 1.5 }}
                        >
                            Seed defaults
                        </LoadingButton>
                        <LoadingButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ textTransform: "none", fontWeight: 700 }}>
                            Add type
                        </LoadingButton>
                    </>
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
                        <Tooltip title={row.isActive ? "Deactivate" : "Already inactive"}>
                            <span>
                                <IconButton size="small" disabled={!row.isActive} onClick={(e) => { e.stopPropagation(); setPendingDeactivate(row); }}>
                                    <BlockOutlinedIcon fontSize="small" />
                                </IconButton>
                            </span>
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
                        <EmptyState title="No product types yet" description="Add a category such as Bots or Signals, or seed the defaults." />
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
                open={!!pendingDeactivate}
                title="Deactivate product type"
                description={pendingDeactivate ? `"${pendingDeactivate.name}" will be marked inactive. Existing products keep their assignment but new ones won't be able to select it.` : undefined}
                confirmLabel="Deactivate"
                danger
                loading={deactivateProductType.isPending}
                onConfirm={handleConfirmDeactivate}
                onCancel={() => setPendingDeactivate(null)}
            />
        </>
    );
}
