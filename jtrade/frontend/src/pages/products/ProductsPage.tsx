import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import TuneOutlinedIcon from "@mui/icons-material/TuneOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

import type { Product } from "@/types/products";
import { refId } from "@/types/products";

import { useDeleteProduct, useProducts, useReviewProduct } from "@/hooks/api/useProducts";
import { useProductTypes } from "@/hooks/api/useProductTypes";
import { usePlatforms } from "@/hooks/api/usePlatforms";
import { useListState } from "@/hooks/useListState";

const STATUSES = ["draft", "pending_review", "published", "suspended", "archived"];
const statusColor = (status: string): "success" | "warning" | "error" | "default" =>
    status === "published" ? "success" : status === "pending_review" ? "warning" : status === "suspended" ? "error" : "default";

export default function ProductsPage({ review = false }: { review?: boolean }) {
    const navigate = useNavigate();
    const q = useProducts(review ? "review" : "mine");
    const allProducts = q.data ?? [];

    const typesQuery = useProductTypes();
    const platformsQuery = usePlatforms();
    const types = typesQuery.data ?? [];
    const platforms = platformsQuery.data ?? [];

    const list = useListState();
    const statusFilter = list.filters["status"] ?? "";
    const typeFilter = list.filters["type"] ?? "";
    const platformFilter = list.filters["platform"] ?? "";

    const products = React.useMemo(() => {
        let rows = allProducts;
        if (list.debouncedSearch.trim()) {
            const query = list.debouncedSearch.trim().toLowerCase();
            rows = rows.filter(
                (p) => p.key.toLowerCase().includes(query) || p.name.toLowerCase().includes(query) || (p.description ?? "").toLowerCase().includes(query),
            );
        }
        if (statusFilter) rows = rows.filter((p) => p.status === statusFilter);
        if (typeFilter) rows = rows.filter((p) => refId(p.typeProductId ?? undefined) === typeFilter);
        if (platformFilter) rows = rows.filter((p) => refId(p.platformId ?? undefined) === platformFilter);
        return rows;
    }, [allProducts, list.debouncedSearch, statusFilter, typeFilter, platformFilter]);

    const reviewProduct = useReviewProduct();
    const deleteProduct = useDeleteProduct();
    const [pendingDelete, setPendingDelete] = React.useState<Product | null>(null);

    const openOnboarding = (row: Product) => navigate(`/provider/products/${row._id}/onboarding`);

    const columns: GridColDef<Product>[] = [
        { field: "name", headerName: "Product", flex: 1, minWidth: 200, renderCell: (p) => (
            <Stack justifyContent="center" sx={{ height: "100%", minWidth: 0 }}>
                <Typography variant="body2" fontWeight={800} lineHeight={1.3} noWrap>{p.row.name}</Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1.3} noWrap>{p.row.key}</Typography>
            </Stack>
        ) },
        { field: "typeProductId", headerName: "Type", width: 120, valueGetter: (_v, row) => row.typeProductId?.name ?? "—" },
        {
            field: "commercial", headerName: "Commercial", width: 140, sortable: false,
            renderCell: (p) => (
                p.row.onboarding?.completedAt
                    ? <Chip size="small" color="success" variant="outlined" label="Ready" />
                    : <Chip size="small" color="default" variant="outlined" label="In progress" />
            ),
        },
        { field: "status", headerName: "Status", width: 140, renderCell: (p) => (
            <Chip size="small" color={statusColor(p.row.status)} label={p.row.status.replace(/_/g, " ")} />
        ) },
    ];

    return (
        <>
            <PageHeader
                title={review ? "Product review" : "Products"}
                count={allProducts.length}
                subtitle={review ? "Review products submitted by provider organizations." : "Create and manage the products owned by your provider organization."}
                actions={
                    !review && (
                        <LoadingButton variant="contained" startIcon={<AddIcon />} onClick={() => navigate("/provider/products/new")} sx={{ textTransform: "none", fontWeight: 700 }}>
                            New product
                        </LoadingButton>
                    )
                }
            />

            <SearchToolbar
                search={list.search}
                onSearchChange={list.setSearch}
                placeholder="Search key, name, description…"
                hasActiveFilters={list.hasActiveFilters}
                onClearFilters={list.clearFilters}
            >
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={(e) => list.setFilter("status", e.target.value)}>
                        <MenuItem value="">All statuses</MenuItem>
                        {STATUSES.map((value) => <MenuItem key={value} value={value}>{value.replace(/_/g, " ")}</MenuItem>)}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Type</InputLabel>
                    <Select value={typeFilter} label="Type" onChange={(e) => list.setFilter("type", e.target.value)}>
                        <MenuItem value="">All types</MenuItem>
                        {types.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Platform</InputLabel>
                    <Select value={platformFilter} label="Platform" onChange={(e) => list.setFilter("platform", e.target.value)}>
                        <MenuItem value="">All platforms</MenuItem>
                        {platforms.map((item) => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}
                    </Select>
                </FormControl>
            </SearchToolbar>

            <DataTable<Product>
                columns={columns}
                rows={products}
                total={products.length}
                page={0}
                pageSize={50}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                getRowId={(row) => row._id}
                onRowClick={review ? undefined : openOnboarding}
                rowActions={(row) => (
                    <>
                        {!review && (
                            <>
                                <Tooltip title="Continue onboarding">
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); openOnboarding(row); }}>
                                        <TuneOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Manage versions">
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/provider/product-versions?productId=${row._id}`); }}>
                                        <LayersOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                {row.status !== "published" && (
                                    <Tooltip title="Delete product">
                                        <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); setPendingDelete(row); }}>
                                            <DeleteOutlineIcon fontSize="small" />
                                        </IconButton>
                                    </Tooltip>
                                )}
                            </>
                        )}
                        {review && (
                            <>
                                <Tooltip title="Publish">
                                    <IconButton size="small" color="success" onClick={(e) => { e.stopPropagation(); reviewProduct.mutate({ id: row._id, status: "published" }); }}>
                                        <CheckCircleOutlineIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Suspend">
                                    <IconButton size="small" color="warning" onClick={(e) => { e.stopPropagation(); reviewProduct.mutate({ id: row._id, status: "suspended" }); }}>
                                        <BlockOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </>
                        )}
                    </>
                )}
                emptyState={
                    list.hasActiveFilters ? (
                        <EmptyState
                            title="No products match your filters"
                            description="Try adjusting your search or clearing the filters."
                            action={<LoadingButton variant="outlined" onClick={list.clearFilters}>Clear filters</LoadingButton>}
                        />
                    ) : (
                        <EmptyState title="No products yet" description={review ? "No products have been submitted yet." : "Create the first product for this provider organization."} />
                    )
                }
                mobileCardConfig={{
                    primaryText: "name",
                    secondaryText: "key",
                    badge: (row) => <Chip size="small" color={statusColor(row.status)} label={row.status.replace(/_/g, " ")} />,
                    fields: [
                        { field: "typeProductId", label: "Type", render: (_v, row) => row.typeProductId?.name ?? "—" },
                        { field: "onboarding", label: "Commercial", render: (_v, row) => (row.onboarding?.completedAt ? "Ready" : "In progress") },
                    ],
                }}
            />

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete product"
                description={
                    pendingDelete
                        ? `Permanently delete "${pendingDelete.name}", its versions and pricing. This cannot be undone. Published products cannot be deleted.`
                        : undefined
                }
                confirmLabel="Delete"
                danger
                loading={deleteProduct.isPending}
                onConfirm={async () => {
                    if (!pendingDelete) return;
                    await deleteProduct.mutateAsync(pendingDelete._id).catch(() => {});
                    setPendingDelete(null);
                }}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
}
