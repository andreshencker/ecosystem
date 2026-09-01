import * as React from "react";
import { Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip, Typography } from "@mui/material";
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

import IndicatorForm from "@/components/domain/indicators/IndicatorForm";

import type { CreateIndicatorPayload, Indicator } from "@/types/indicator";
import { useCreateIndicator, useDeleteIndicator, useIndicators, useSetChannelEnabled, useUpdateIndicator } from "@/hooks/api/useIndicators";
import { useListState } from "@/hooks/useListState";

export default function ProviderIndicatorsPage() {
    const q = useIndicators();
    const all = q.data ?? [];

    const list = useListState();
    const statusFilter = list.filters["status"] ?? "";

    const rows = React.useMemo(() => {
        let r = all;
        const query = list.debouncedSearch.trim().toLowerCase();
        if (query) r = r.filter((i) => i.name.toLowerCase().includes(query) || i.key.toLowerCase().includes(query));
        if (statusFilter === "active") r = r.filter((i) => i.isActive);
        if (statusFilter === "inactive") r = r.filter((i) => !i.isActive);
        return r;
    }, [all, list.debouncedSearch, statusFilter]);

    const createMut = useCreateIndicator();
    const updateMut = useUpdateIndicator();
    const deleteMut = useDeleteIndicator();
    const toggleAlertMut = useSetChannelEnabled();

    const [creating, setCreating] = React.useState(false);
    const [editingId, setEditingId] = React.useState<string | null>(null);
    const [pendingDelete, setPendingDelete] = React.useState<Indicator | null>(null);

    const editing = editingId ? all.find((i) => i.id === editingId) ?? null : null;

    const handleCreate = async (values: CreateIndicatorPayload) => {
        await createMut.mutateAsync(values);
        setCreating(false);
    };

    const handleUpdate = async (values: CreateIndicatorPayload) => {
        if (!editing?.id) return;
        await updateMut.mutateAsync({
            id: editing.id,
            data: { name: values.name, description: values.description, isActive: values.isActive },
        });
        setEditingId(null);
    };

    const handleDelete = async () => {
        if (!pendingDelete?.id) return;
        await deleteMut.mutateAsync(pendingDelete.id);
        setPendingDelete(null);
        if (editingId === pendingDelete.id) setEditingId(null);
    };

    const columns: GridColDef<Indicator>[] = [
        { field: "name", headerName: "Name", flex: 1, minWidth: 200 },
        {
            field: "key",
            headerName: "Key",
            width: 160,
            renderCell: (p) => <Typography variant="caption" fontFamily="monospace">{p.value}</Typography>,
        },
        {
            field: "pairs",
            headerName: "Alerts",
            flex: 1,
            minWidth: 200,
            sortable: false,
            renderCell: (p) => {
                const pairs = (p.value as Indicator["pairs"]) ?? [];
                if (!pairs.length) return <Typography variant="caption" color="text.disabled">—</Typography>;
                const label = pairs.slice(0, 3).map((x) => `${x.symbol || "?"}·${x.timeframe}`).join(", ");
                return (
                    <Tooltip title={pairs.map((x) => `${x.symbol || "?"} ${x.timeframe}`).join("  •  ")}>
                        <Typography variant="caption" noWrap>{label}{pairs.length > 3 ? ` +${pairs.length - 3}` : ""}</Typography>
                    </Tooltip>
                );
            },
        },
        {
            field: "isActive",
            headerName: "Status",
            width: 110,
            renderCell: (p) => (
                <Chip label={p.value ? "Active" : "Inactive"} size="small" color={p.value ? "success" : "default"} variant="outlined" />
            ),
        },
    ];

    return (
        <>
            <PageHeader
                title="Indicators"
                count={all.length}
                subtitle="Reusable signal-source definitions. Attach them to a signals product to get its webhook."
                actions={
                    <LoadingButton variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
                        Add indicator
                    </LoadingButton>
                }
            />

            <SearchToolbar
                search={list.search}
                onSearchChange={list.setSearch}
                placeholder="Search name or key…"
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

            <DataTable<Indicator>
                columns={columns}
                rows={rows}
                total={rows.length}
                page={0}
                pageSize={50}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                getRowId={(row) => row.id ?? row.key}
                error={q.isError ? (q.error as Error) : null}
                onRowClick={(row) => row.id && setEditingId(row.id)}
                rowActions={(row) => (
                    <>
                        <Tooltip title="Edit">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); row.id && setEditingId(row.id); }}>
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
                            title="No indicators match your filters"
                            description="Try adjusting your search or clearing the filters."
                            action={<LoadingButton variant="outlined" onClick={list.clearFilters}>Clear filters</LoadingButton>}
                        />
                    ) : (
                        <EmptyState title="No indicators yet" description="Define an indicator and the symbol/timeframe channels it fires on." />
                    )
                }
                mobileCardConfig={{
                    primaryText: "name",
                    secondaryText: "key",
                    badge: (row) => <Chip label={row.isActive ? "Active" : "Inactive"} size="small" color={row.isActive ? "success" : "default"} />,
                    fields: [
                        { field: "pairs", label: "Alerts", render: (v) => {
                            const pairs = (v as Indicator["pairs"]) ?? [];
                            return pairs.length ? pairs.map((x) => `${x.symbol || "?"}·${x.timeframe}`).join(", ") : "—";
                        } },
                    ],
                }}
            />

            <FormDrawer open={creating} onClose={() => setCreating(false)} title="New indicator">
                <IndicatorForm loading={createMut.isPending} onSubmit={handleCreate} onCancel={() => setCreating(false)} />
            </FormDrawer>

            <FormDrawer open={!!editing} onClose={() => setEditingId(null)} title="Edit indicator">
                {editing && (
                    <IndicatorForm
                        initial={editing}
                        loading={updateMut.isPending}
                        onSubmit={handleUpdate}
                        onCancel={() => setEditingId(null)}
                        onToggleAlert={(channelId, enabled) =>
                            editing.id && toggleAlertMut.mutate({ id: editing.id, channelId, enabled })
                        }
                    />
                )}
            </FormDrawer>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete indicator"
                description={pendingDelete ? `"${pendingDelete.name}" will be removed. Products that bundle it lose this signal source.` : undefined}
                confirmLabel="Delete"
                danger
                loading={deleteMut.isPending}
                onConfirm={handleDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
}
