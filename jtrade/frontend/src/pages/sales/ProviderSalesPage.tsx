import * as React from "react";
import { Chip, FormControl, InputLabel, MenuItem, Select, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingButton } from "@/components/shared/LoadingButton";

import { useSales } from "@/hooks/api/useOrders";
import { formatPrice, type ProductRef } from "@/types/products";
import type { Order, OrderStatus } from "@/types/order";
import { useListState } from "@/hooks/useListState";

const STATUS: OrderStatus[] = ["active", "cancelled", "expired", "past_due", "refunded"];
const statusColor = (s: string): "success" | "warning" | "error" | "default" =>
    s === "active" ? "success" : s === "past_due" ? "warning" : s === "cancelled" || s === "expired" ? "default" : "error";

const productName = (p: Order["productId"]) => (typeof p === "object" ? (p as ProductRef).name : "—");
const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : "—");

export default function ProviderSalesPage() {
    const q = useSales();
    const all = q.data ?? [];

    const list = useListState();
    const statusFilter = list.filters["status"] ?? "";

    const rows = React.useMemo(() => {
        let r = all;
        const query = list.debouncedSearch.trim().toLowerCase();
        if (query) r = r.filter((o) => productName(o.productId).toLowerCase().includes(query) || o.clientGrapiflyUserId.toLowerCase().includes(query));
        if (statusFilter) r = r.filter((o) => o.status === statusFilter);
        return r;
    }, [all, list.debouncedSearch, statusFilter]);

    const gross = all.filter((o) => o.status === "active").reduce((sum, o) => sum + o.amountPaid, 0);

    const columns: GridColDef<Order>[] = [
        { field: "productId", headerName: "Product", flex: 1, minWidth: 180, valueGetter: (_v, row) => productName(row.productId) },
        { field: "clientGrapiflyUserId", headerName: "Client", flex: 1, minWidth: 160 },
        {
            field: "amountPaid", headerName: "Amount", width: 130,
            renderCell: (p) => {
                const suffix = p.row.pricingType === "recurring" ? `/${p.row.interval === "year" ? "yr" : "mo"}` : "";
                return <Typography variant="body2">{formatPrice(p.row.amountPaid, p.row.currency)}{suffix}</Typography>;
            },
        },
        { field: "status", headerName: "Status", width: 120, renderCell: (p) => (
            <Chip size="small" variant="outlined" color={statusColor(p.value)} label={String(p.value).replace(/_/g, " ")} />
        ) },
        { field: "startedAt", headerName: "Started", width: 120, valueFormatter: (v) => fmtDate(v as string) },
    ];

    return (
        <>
            <PageHeader
                title="Sales"
                count={all.length}
                subtitle={`What your organization sold. Active recurring revenue: ${formatPrice(gross)}.`}
            />

            <SearchToolbar
                search={list.search}
                onSearchChange={list.setSearch}
                placeholder="Search product or client…"
                hasActiveFilters={list.hasActiveFilters}
                onClearFilters={list.clearFilters}
            >
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={(e) => list.setFilter("status", e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {STATUS.map((s) => <MenuItem key={s} value={s}>{s.replace(/_/g, " ")}</MenuItem>)}
                    </Select>
                </FormControl>
            </SearchToolbar>

            <DataTable<Order>
                columns={columns}
                rows={rows}
                total={rows.length}
                page={0}
                pageSize={50}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                getRowId={(row) => row._id}
                error={q.isError ? (q.error as Error) : null}
                emptyState={
                    list.hasActiveFilters ? (
                        <EmptyState title="No sales match your filters" description="Try adjusting the search or filters."
                            action={<LoadingButton variant="outlined" onClick={list.clearFilters}>Clear filters</LoadingButton>} />
                    ) : (
                        <EmptyState title="No sales yet" description="Orders appear here when clients buy your published products." />
                    )
                }
                mobileCardConfig={{
                    primaryText: (row) => productName(row.productId),
                    secondaryText: "clientGrapiflyUserId",
                    badge: (row) => <Chip size="small" color={statusColor(row.status)} label={row.status.replace(/_/g, " ")} />,
                    fields: [
                        { field: "amountPaid", label: "Amount", render: (_v, row) => formatPrice(row.amountPaid, row.currency) },
                        { field: "startedAt", label: "Started", render: (v) => fmtDate(v as string) },
                    ],
                }}
            />
        </>
    );
}
