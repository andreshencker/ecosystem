import * as React from "react";
import {
    Box,
    Chip,
    List,
    ListItem,
    ListItemText,
    Stack,
    Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";

import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { EmptyState } from "@/components/shared/EmptyState";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { useListState } from "@/hooks/useListState";
import { useProviderPaymentStatuses } from "@/hooks/api/usePaymentsAdmin";
import type {
    ProviderPaymentMethodRow,
    ProviderPaymentMethodStatus,
    ProviderPaymentOrg,
} from "@/types/payments-admin";

const STATUS_COLOR: Record<ProviderPaymentMethodStatus, "success" | "warning" | "error"> = {
    complete: "success",
    pending: "warning",
    restricted: "error",
};
const STATUS_LABEL: Record<ProviderPaymentMethodStatus, string> = {
    complete: "Ready",
    pending: "In progress",
    restricted: "Needs attention",
};

function StatusChip({ status }: { status: ProviderPaymentMethodStatus }) {
    return (
        <Chip size="small" variant="outlined" color={STATUS_COLOR[status]} label={STATUS_LABEL[status]} />
    );
}

function fmtDate(iso: string | null): string {
    if (!iso) return "—";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export function ProviderPaymentsTab() {
    const q = useProviderPaymentStatuses();
    const list = useListState();
    const rows = q.data ?? [];

    const filtered = React.useMemo(() => {
        const query = list.debouncedSearch.trim().toLowerCase();
        if (!query) return rows;
        return rows.filter(
            (r) =>
                r.organizationName.toLowerCase().includes(query) ||
                r.organizationId.toLowerCase().includes(query) ||
                r.methods.some((m) => m.method.includes(query)),
        );
    }, [rows, list.debouncedSearch]);

    const [open, setOpen] = React.useState<ProviderPaymentOrg | null>(null);

    const columns: GridColDef<ProviderPaymentOrg>[] = [
        {
            field: "organizationName", headerName: "Provider", flex: 1, minWidth: 200,
            renderCell: (p) => (
                <Stack spacing={0.25}>
                    <Typography variant="body2">{p.row.organizationName}</Typography>
                    {p.row.organizationSlug && (
                        <Typography variant="caption" color="text.secondary">{p.row.organizationSlug}</Typography>
                    )}
                </Stack>
            ),
        },
        {
            field: "baseStatus", headerName: "Base (Stripe)", width: 150, sortable: false,
            renderCell: (p) =>
                p.row.baseStatus ? <StatusChip status={p.row.baseStatus} /> : (
                    <Typography variant="body2" color="text.disabled">not started</Typography>
                ),
        },
        {
            field: "methods", headerName: "Methods", flex: 1, minWidth: 220, sortable: false,
            renderCell: (p) => (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                    {p.row.methods.map((m) => (
                        <Chip
                            key={m.method}
                            size="small"
                            variant="outlined"
                            color={STATUS_COLOR[m.status]}
                            label={`${m.method}`}
                        />
                    ))}
                </Stack>
            ),
        },
        {
            field: "lastChecked", headerName: "Last checked", width: 190, sortable: false,
            valueGetter: (_v, row) =>
                row.methods.reduce<string | null>((acc, m) => (m.lastCheckedAt && (!acc || m.lastCheckedAt > acc) ? m.lastCheckedAt : acc), null),
            renderCell: (p) => (
                <Typography variant="body2" color="text.secondary">{fmtDate(p.value as string | null)}</Typography>
            ),
        },
    ];

    return (
        <>
            <SearchToolbar
                search={list.search}
                onSearchChange={list.setSearch}
                placeholder="Search provider or method…"
                hasActiveFilters={list.hasActiveFilters}
                onClearFilters={list.clearFilters}
            />

            <DataTable<ProviderPaymentOrg>
                columns={columns}
                rows={filtered}
                total={filtered.length}
                page={0}
                pageSize={50}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                getRowId={(row) => row.organizationId}
                onRowClick={setOpen}
                error={q.isError ? (q.error as Error) : null}
                emptyState={
                    <EmptyState
                        title="No providers have started payment setup"
                        description="A row appears here the moment a provider begins connecting a payment method."
                    />
                }
                mobileCardConfig={{
                    primaryText: "organizationName",
                    secondaryText: "organizationId",
                    badge: (row) =>
                        row.baseStatus ? <StatusChip status={row.baseStatus} /> : null,
                    fields: [
                        {
                            field: "methods",
                            label: "Methods",
                            render: (_v, row) => row.methods.map((m) => `${m.method} (${STATUS_LABEL[m.status]})`).join(", "),
                        },
                    ],
                }}
            />

            <FormDrawer
                open={!!open}
                onClose={() => setOpen(null)}
                title={open ? open.organizationName : ""}
                width={520}
            >
                {open && (
                    <Stack spacing={2}>
                        <Box>
                            <Typography variant="caption" color="text.secondary">Organization id</Typography>
                            <Typography variant="body2" sx={{ wordBreak: "break-all" }}>{open.organizationId}</Typography>
                        </Box>

                        {open.methods.map((m: ProviderPaymentMethodRow) => (
                            <Box key={m.method} sx={{ border: 1, borderColor: "divider", borderRadius: 1, p: 1.5 }}>
                                <Box display="flex" alignItems="center" justifyContent="space-between" mb={0.5}>
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        <Typography variant="subtitle2" textTransform="capitalize">{m.method}</Typography>
                                        {m.isBase && <Chip size="small" color="primary" label="Base" />}
                                    </Stack>
                                    <StatusChip status={m.status} />
                                </Box>
                                {m.providerAccountId && (
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        Account: {m.providerAccountId}
                                    </Typography>
                                )}
                                {m.disabledReason && (
                                    <Typography variant="body2" color="error.main" sx={{ mt: 0.5 }}>
                                        {m.disabledReason}
                                    </Typography>
                                )}
                                {m.requirementsDue.length > 0 && (
                                    <List dense disablePadding sx={{ mt: 0.5 }}>
                                        {m.requirementsDue.map((r) => (
                                            <ListItem key={r} disablePadding>
                                                <ListItemText primary={r} primaryTypographyProps={{ variant: "caption" }} />
                                            </ListItem>
                                        ))}
                                    </List>
                                )}
                                <Typography variant="caption" color="text.disabled" display="block" sx={{ mt: 0.5 }}>
                                    Last checked: {fmtDate(m.lastCheckedAt)}
                                </Typography>
                            </Box>
                        ))}
                    </Stack>
                )}
            </FormDrawer>
        </>
    );
}
