import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import LayersOutlinedIcon from "@mui/icons-material/LayersOutlined";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import BlockOutlinedIcon from "@mui/icons-material/BlockOutlined";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { EmptyState } from "@/components/shared/EmptyState";

import ProductForm, { ProductFormValues } from "@/components/domain/products/ProductForm";
import type { Product, ProductPlatformDiscount } from "@/types/products";
import { formatPrice, getEffectivePriceAmount, isDiscountActiveNow, refId } from "@/types/products";

import { useCreateProduct, useProducts, useReviewProduct, useUpdateProduct } from "@/hooks/api/useProducts";
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
        if (typeFilter) rows = rows.filter((p) => refId(p.typeProductId) === typeFilter);
        if (platformFilter) rows = rows.filter((p) => p.platforms?.some((entry) => refId(entry.platformId) === platformFilter));
        return rows;
    }, [allProducts, list.debouncedSearch, statusFilter, typeFilter, platformFilter]);

    const createProduct = useCreateProduct();
    const updateProduct = useUpdateProduct();
    const reviewProduct = useReviewProduct();

    const [editing, setEditing] = React.useState<Product | null>(null);
    const [openForm, setOpenForm] = React.useState(false);

    const saving = createProduct.isPending || updateProduct.isPending;

    const handleAdd = () => { setEditing(null); setOpenForm(true); };
    const handleEdit = (row: Product) => { if (review) return; setEditing(row); setOpenForm(true); };
    const handleCloseForm = () => { setEditing(null); setOpenForm(false); };

    const handleSubmit = async (values: ProductFormValues) => {
        const discount: ProductPlatformDiscount | undefined = values.discountEnabled ? {
            type: values.discountType,
            value: values.discountType === "percentage" ? Number(values.discountValueInput) : Math.round(parseFloat(values.discountValueInput || "0") * 100),
            startsAt: values.discountStartsAt || null,
            endsAt: values.discountEndsAt || null,
            isActive: values.discountActive,
        } : undefined;

        const payload = {
            typeProductId: values.typeProductId,
            key: values.key.trim(),
            name: values.name.trim(),
            description: values.description.trim(),
            platforms: values.platformId ? [{
                platformId: values.platformId,
                billingType: values.billingType,
                billingInterval: values.billingType === "subscription" ? values.billingInterval : undefined,
                priceAmount: Math.round(parseFloat(values.priceInput || "0") * 100),
                currency: "USD",
                discount,
            }] : [],
        };
        if (editing) await updateProduct.mutateAsync({ id: editing._id, data: payload });
        else await createProduct.mutateAsync(payload);
        handleCloseForm();
    };

    const columns: GridColDef<Product>[] = [
        { field: "name", headerName: "Product", flex: 1, minWidth: 180, renderCell: (p) => (
            <Stack justifyContent="center" sx={{ height: "100%", minWidth: 0 }}>
                <Typography variant="body2" fontWeight={800} lineHeight={1.3} noWrap>{p.row.name}</Typography>
                <Typography variant="caption" color="text.secondary" lineHeight={1.3} noWrap>{p.row.key}</Typography>
            </Stack>
        ) },
        { field: "typeProductId", headerName: "Type", width: 140, valueGetter: (_v, row) => row.typeProductId?.name ?? "—" },
        { field: "platforms", headerName: "Platforms", flex: 1, minWidth: 180, renderCell: (p) => (
            <Stack direction="row" gap={0.75} flexWrap="wrap">
                {p.row.platforms?.length
                    ? p.row.platforms.map((entry, index) => <Chip key={index} size="small" variant="outlined" label={entry.platformId?.name ?? "Platform"} />)
                    : "—"}
            </Stack>
        ) },
        { field: "price", headerName: "Price", width: 160, sortable: false, renderCell: (p) => {
            const platform = p.row.platforms?.[0];
            if (!platform || typeof platform.priceAmount !== "number") return <Typography variant="body2" color="text.secondary">Not priced</Typography>;
            const suffix = platform.billingType === "subscription" ? `/${platform.billingInterval === "year" ? "yr" : "mo"}` : "";
            const active = isDiscountActiveNow(platform.discount);
            if (!active) return <Typography variant="body2">{formatPrice(platform.priceAmount, platform.currency)}{suffix}</Typography>;
            const effective = getEffectivePriceAmount(platform);
            return (
                <Stack>
                    <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through" }}>{formatPrice(platform.priceAmount, platform.currency)}</Typography>
                    <Typography variant="body2" color="success.main" fontWeight={700}>{formatPrice(effective, platform.currency)}{suffix}</Typography>
                </Stack>
            );
        } },
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
                        <LoadingButton variant="contained" startIcon={<AddIcon />} onClick={handleAdd} sx={{ textTransform: "none", fontWeight: 700 }}>
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
                onRowClick={review ? undefined : handleEdit}
                rowActions={(row) => (
                    <>
                        {!review && (
                            <>
                                <Tooltip title="Edit">
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEdit(row); }}>
                                        <EditOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Manage versions">
                                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); navigate(`/provider/product-versions?productId=${row._id}`); }}>
                                        <LayersOutlinedIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
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
                        { field: "platforms", label: "Price", render: (_v, row) => {
                            const platform = row.platforms?.[0];
                            if (!platform || typeof platform.priceAmount !== "number") return "Not priced";
                            const effective = getEffectivePriceAmount(platform);
                            return formatPrice(effective, platform.currency);
                        } },
                    ],
                }}
            />

            <FormDrawer
                open={openForm}
                onClose={handleCloseForm}
                title={editing ? "Edit product" : "New product"}
                width={620}
            >
                <ProductForm initial={editing} loading={saving} onSubmit={handleSubmit} onCancel={handleCloseForm} />
            </FormDrawer>
        </>
    );
}
