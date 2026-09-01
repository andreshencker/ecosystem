import * as React from "react";
import { Chip, IconButton, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";

import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";

import { useCancelOrder, useMyOrders } from "@/hooks/api/useOrders";
import { formatPrice, type ProductRef } from "@/types/products";
import type { Order } from "@/types/order";

const productName = (p: Order["productId"]) => (typeof p === "object" ? (p as ProductRef).name : "—");
const fmtDate = (v?: string | null) => (v ? new Date(v).toLocaleDateString() : "—");
const statusColor = (s: string): "success" | "warning" | "error" | "default" =>
    s === "active" ? "success" : s === "past_due" ? "warning" : s === "refunded" ? "error" : "default";

export default function ClientOrdersPage() {
    const q = useMyOrders();
    const cancelMut = useCancelOrder();
    const rows = q.data ?? [];
    const [pendingCancel, setPendingCancel] = React.useState<Order | null>(null);

    const handleCancel = async () => {
        if (!pendingCancel?._id) return;
        await cancelMut.mutateAsync(pendingCancel._id);
        setPendingCancel(null);
    };

    const columns: GridColDef<Order>[] = [
        { field: "productId", headerName: "Product", flex: 1, minWidth: 200, valueGetter: (_v, row) => productName(row.productId) },
        {
            field: "amountPaid", headerName: "Price", width: 130,
            renderCell: (p) => {
                const suffix = p.row.pricingType === "recurring" ? `/${p.row.interval === "year" ? "yr" : "mo"}` : "";
                return <Typography variant="body2">{formatPrice(p.row.amountPaid, p.row.currency)}{suffix}</Typography>;
            },
        },
        { field: "status", headerName: "Status", width: 150, renderCell: (p) => (
            <>
                <Chip size="small" variant="outlined" color={statusColor(p.value)} label={String(p.value).replace(/_/g, " ")} />
                {p.row.isTrial && p.row.status === "active" && (
                    <Chip size="small" color="info" variant="outlined" label="trial" sx={{ ml: 0.5 }} />
                )}
            </>
        ) },
        {
            field: "currentPeriodEnd", headerName: "Renews", width: 150,
            valueGetter: (_v, row) => {
                if (row.status !== "active") return "—";
                if (row.isTrial && row.trialEndsAt) return `trial ends ${fmtDate(row.trialEndsAt)}`;
                return row.pricingType === "recurring" ? fmtDate(row.currentPeriodEnd) : "—";
            },
        },
        { field: "startedAt", headerName: "Started", width: 120, valueFormatter: (v) => fmtDate(v as string) },
    ];

    return (
        <>
            <PageHeader title="My Purchases" count={rows.length} subtitle="Products and subscriptions you've bought." />

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
                rowActions={(row) => (
                    row.status === "active" && row.pricingType === "recurring" ? (
                        <Tooltip title="Cancel subscription">
                            <IconButton size="small" onClick={() => setPendingCancel(row)}>
                                <CancelOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    ) : null
                )}
                emptyState={<EmptyState title="No purchases yet" description="Products you buy from the marketplace show up here." />}
                mobileCardConfig={{
                    primaryText: (row) => productName(row.productId),
                    secondaryText: (row) => formatPrice(row.amountPaid, row.currency),
                    badge: (row) => <Chip size="small" color={statusColor(row.status)} label={row.status.replace(/_/g, " ")} />,
                    fields: [
                        { field: "startedAt", label: "Started", render: (v) => fmtDate(v as string) },
                    ],
                }}
            />

            <ConfirmDialog
                open={!!pendingCancel}
                title="Cancel subscription"
                description={pendingCancel ? `Your subscription to "${productName(pendingCancel.productId)}" will be cancelled.` : undefined}
                confirmLabel="Cancel subscription"
                cancelLabel="Keep it"
                danger
                loading={cancelMut.isPending}
                onConfirm={handleCancel}
                onCancel={() => setPendingCancel(null)}
            />
        </>
    );
}
