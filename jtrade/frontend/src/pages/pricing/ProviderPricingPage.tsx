import * as React from "react";
import { Chip, FormControl, InputLabel, MenuItem, Select, Stack, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingButton } from "@/components/shared/LoadingButton";

import ProductPricingPanel from "@/components/domain/products/ProductPricingPanel";
import { usePricingOverview } from "@/hooks/api/useProductPricing";
import { formatPrice, refId, type PricingOverviewRow } from "@/types/products";
import { useListState } from "@/hooks/useListState";

const STATUSES = ["draft", "pending_review", "published", "suspended", "archived"];
const statusColor = (s: string): "success" | "warning" | "error" | "default" =>
    s === "published" ? "success" : s === "pending_review" ? "warning" : s === "suspended" ? "error" : "default";

const defaultOption = (row: PricingOverviewRow) => row.options.find((option) => option.isDefault) ?? row.options.find((option) => option.status === "active") ?? null;

export default function ProviderPricingPage() {
    const q = usePricingOverview();
    const all = q.data ?? [];

    const list = useListState();
    const statusFilter = list.filters["status"] ?? "";

    const rows = React.useMemo(() => {
        let r = all;
        const query = list.debouncedSearch.trim().toLowerCase();
        if (query) r = r.filter((x) => x.product.name.toLowerCase().includes(query) || x.product.key.toLowerCase().includes(query));
        if (statusFilter) r = r.filter((x) => x.product.status === statusFilter);
        return r;
    }, [all, list.debouncedSearch, statusFilter]);

    const [editingId, setEditingId] = React.useState<string | null>(null);
    const editingRow = editingId ? all.find((x) => x.product._id === editingId) ?? null : null;

    const priced = all.filter((x) => x.options.some((option) => option.status === "active")).length;

    const columns: GridColDef<PricingOverviewRow>[] = [
        {
            field: "product", headerName: "Product", flex: 1, minWidth: 200,
            valueGetter: (_v, row) => row.product.name,
            renderCell: (p) => (
                <Stack spacing={0.2}>
                    <Typography variant="body2" fontWeight={600}>{p.row.product.name}</Typography>
                    <Typography variant="caption" color="text.secondary" fontFamily="monospace">{p.row.product.key}</Typography>
                </Stack>
            ),
        },
        {
            field: "type", headerName: "Type / Platform", width: 190, sortable: false,
            renderCell: (p) => (
                <Stack direction="row" spacing={0.5} flexWrap="wrap">
                    <Chip size="small" variant="outlined" label={p.row.product.typeProductId?.name ?? "—"} />
                    <Chip size="small" variant="outlined" label={p.row.product.platformId?.name ?? "—"} />
                </Stack>
            ),
        },
        { field: "options", headerName: "Options", width: 100, sortable: false, valueGetter: (_v, row) => row.options.length },
        {
            field: "price", headerName: "Price", width: 200, sortable: false,
            renderCell: (p) => {
                const option = defaultOption(p.row);
                if (!option) return <Typography variant="body2" color="text.secondary">Not priced</Typography>;
                return (
                    <Stack direction="row" spacing={0.75} alignItems="baseline" flexWrap="wrap">
                        {option.hasActivePromotion && (
                            <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                                {formatPrice(option.amount, option.currency)}
                            </Typography>
                        )}
                        <Typography variant="body2" fontWeight={700}>{formatPrice(option.effectiveAmount, option.currency)}</Typography>
                        {option.trialEnabled && option.trialDays > 0 && (
                            <Chip size="small" color="info" variant="outlined" label={`${option.trialDays}d trial`} />
                        )}
                    </Stack>
                );
            },
        },
        {
            field: "status", headerName: "Status", width: 130,
            valueGetter: (_v, row) => row.product.status,
            renderCell: (p) => <Chip size="small" variant="outlined" color={statusColor(String(p.value))} label={String(p.value).replace(/_/g, " ")} />,
        },
    ];

    return (
        <>
            <PageHeader
                title="Pricing"
                count={all.length}
                subtitle={`${priced} of ${all.length} products priced. Click a product to set its price, trial and promotions.`}
            />

            <SearchToolbar
                search={list.search}
                onSearchChange={list.setSearch}
                placeholder="Search product…"
                hasActiveFilters={list.hasActiveFilters}
                onClearFilters={list.clearFilters}
            >
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={(e) => list.setFilter("status", e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {STATUSES.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, " ")}</MenuItem>)}
                    </Select>
                </FormControl>
            </SearchToolbar>

            <DataTable<PricingOverviewRow>
                columns={columns}
                rows={rows}
                total={rows.length}
                page={0}
                pageSize={50}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                getRowId={(row) => row.product._id}
                onRowClick={(row) => setEditingId(row.product._id)}
                error={q.isError ? (q.error as Error) : null}
                emptyState={
                    list.hasActiveFilters ? (
                        <EmptyState title="No products match your filters" description="Try adjusting the search or filters."
                            action={<LoadingButton variant="outlined" onClick={list.clearFilters}>Clear filters</LoadingButton>} />
                    ) : (
                        <EmptyState title="No products yet" description="Create a product first, then set its price here." />
                    )
                }
                mobileCardConfig={{
                    primaryText: (row) => row.product.name,
                    secondaryText: (row) => row.product.key,
                    badge: (row) => <Chip size="small" color={statusColor(row.product.status)} label={row.product.status.replace(/_/g, " ")} />,
                    fields: [
                        { field: "options", label: "Options", render: (_v, row) => String(row.options.length) },
                        {
                            field: "product", label: "Price",
                            render: (_v, row) => {
                                const option = defaultOption(row);
                                return option ? formatPrice(option.effectiveAmount, option.currency) : "Not priced";
                            },
                        },
                    ],
                }}
            />

            <FormDrawer
                open={!!editingRow}
                onClose={() => setEditingId(null)}
                title={editingRow ? editingRow.product.name : "Pricing"}
                width={560}
            >
                {editingRow && (
                    <>
                        <Typography variant="caption" color="text.secondary" fontFamily="monospace" sx={{ display: "block", mb: 1 }}>
                            {editingRow.product.key} · {refId(editingRow.product.typeProductId) ? editingRow.product.typeProductId?.name : "—"}
                        </Typography>
                        <ProductPricingPanel productId={editingRow.product._id} />
                    </>
                )}
            </FormDrawer>
        </>
    );
}
