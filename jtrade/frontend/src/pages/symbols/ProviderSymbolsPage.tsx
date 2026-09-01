import * as React from "react";
import { Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Stack, Switch, Tooltip, Typography } from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import PlaylistAddIcon from "@mui/icons-material/PlaylistAdd";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { EmptyState } from "@/components/shared/EmptyState";

import SymbolForm from "@/components/domain/symbols/SymbolForm";
import BulkSymbolForm from "@/components/domain/symbols/BulkSymbolForm";

import type { CreateSymbolPayload, SymbolItem } from "@/types/symbol";
import {
    useBulkCreateSymbols,
    useCreateSymbol,
    useDeleteSymbol,
    useSetSymbolStatus,
    useSymbols,
    useUpdateSymbol,
} from "@/hooks/api/useSymbols";
import { useListState } from "@/hooks/useListState";

const fmtDate = (v?: string) => (v ? new Date(v).toLocaleDateString() : "—");

export default function ProviderSymbolsPage() {
    const q = useSymbols();
    const all = q.data ?? [];

    const list = useListState();
    const statusFilter = list.filters["status"] ?? "";

    const rows = React.useMemo(() => {
        let r = all;
        const query = list.debouncedSearch.trim().toLowerCase();
        if (query) r = r.filter((s) => s.symbol.toLowerCase().includes(query) || s.aliases.some((a) => a.toLowerCase().includes(query)));
        if (statusFilter === "active") r = r.filter((s) => s.isActive);
        if (statusFilter === "inactive") r = r.filter((s) => !s.isActive);
        return r;
    }, [all, list.debouncedSearch, statusFilter]);

    const createMut = useCreateSymbol();
    const bulkMut = useBulkCreateSymbols();
    const updateMut = useUpdateSymbol();
    const statusMut = useSetSymbolStatus();
    const deleteMut = useDeleteSymbol();

    const [creating, setCreating] = React.useState(false);
    const [bulk, setBulk] = React.useState(false);
    const [editing, setEditing] = React.useState<SymbolItem | null>(null);
    const [pendingDelete, setPendingDelete] = React.useState<SymbolItem | null>(null);

    const handleCreate = async (values: CreateSymbolPayload) => {
        await createMut.mutateAsync(values);
        setCreating(false);
    };
    const handleBulk = async (symbols: string[]) => {
        await bulkMut.mutateAsync(symbols);
        setBulk(false);
    };
    const handleUpdate = async (values: CreateSymbolPayload) => {
        if (!editing?.id) return;
        await updateMut.mutateAsync({ id: editing.id, data: values });
        setEditing(null);
    };
    const handleDelete = async () => {
        if (!pendingDelete?.id) return;
        await deleteMut.mutateAsync(pendingDelete.id);
        setPendingDelete(null);
    };

    const columns: GridColDef<SymbolItem>[] = [
        {
            field: "symbol",
            headerName: "Symbol",
            width: 160,
            renderCell: (p) => <Typography variant="body2" fontWeight={700} fontFamily="monospace">{p.value}</Typography>,
        },
        {
            field: "aliases",
            headerName: "Aliases",
            flex: 1,
            minWidth: 200,
            sortable: false,
            renderCell: (p) => {
                const aliases = (p.value as string[]) ?? [];
                if (!aliases.length) return <Typography variant="caption" color="text.disabled">—</Typography>;
                return (
                    <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
                        {aliases.map((a) => <Chip key={a} label={a} size="small" variant="outlined" />)}
                    </Stack>
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
        {
            field: "createdAt",
            headerName: "Added",
            width: 120,
            valueFormatter: (value) => fmtDate(value as string),
        },
    ];

    return (
        <>
            <PageHeader
                title="Symbols"
                count={all.length}
                subtitle="The instrument catalogue for your organization. Signals and executions resolve against these."
                actions={
                    <Stack direction="row" spacing={1}>
                        <LoadingButton variant="outlined" startIcon={<PlaylistAddIcon />} onClick={() => setBulk(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
                            Bulk add
                        </LoadingButton>
                        <LoadingButton variant="contained" startIcon={<AddIcon />} onClick={() => setCreating(true)} sx={{ textTransform: "none", fontWeight: 700 }}>
                            Add symbol
                        </LoadingButton>
                    </Stack>
                }
            />

            <SearchToolbar
                search={list.search}
                onSearchChange={list.setSearch}
                placeholder="Search symbol or alias…"
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

            <DataTable<SymbolItem>
                columns={columns}
                rows={rows}
                total={rows.length}
                page={0}
                pageSize={100}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                getRowId={(row) => row.id ?? row.symbol}
                error={q.isError ? (q.error as Error) : null}
                onRowClick={(row) => setEditing(row)}
                rowActions={(row) => (
                    <>
                        <Tooltip title={row.isActive ? "Deactivate" : "Activate"}>
                            <Switch
                                size="small"
                                checked={row.isActive}
                                disabled={statusMut.isPending}
                                onClick={(e) => e.stopPropagation()}
                                onChange={() => row.id && statusMut.mutate({ id: row.id, isActive: !row.isActive })}
                            />
                        </Tooltip>
                        <Tooltip title="Edit">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditing(row); }}>
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
                            title="No symbols match your filters"
                            description="Try adjusting your search or clearing the filters."
                            action={<LoadingButton variant="outlined" onClick={list.clearFilters}>Clear filters</LoadingButton>}
                        />
                    ) : (
                        <EmptyState title="No symbols yet" description="Add the instruments your indicators and products trade." />
                    )
                }
                mobileCardConfig={{
                    primaryText: "symbol",
                    secondaryText: (row) => row.aliases.join(", ") || "No aliases",
                    badge: (row) => <Chip label={row.isActive ? "Active" : "Inactive"} size="small" color={row.isActive ? "success" : "default"} />,
                    fields: [
                        { field: "createdAt", label: "Added", render: (v) => fmtDate(v as string) },
                    ],
                }}
            />

            <FormDrawer open={creating} onClose={() => setCreating(false)} title="New symbol">
                <SymbolForm loading={createMut.isPending} onSubmit={handleCreate} onCancel={() => setCreating(false)} />
            </FormDrawer>

            <FormDrawer open={bulk} onClose={() => setBulk(false)} title="Bulk add symbols">
                <BulkSymbolForm loading={bulkMut.isPending} onSubmit={handleBulk} onCancel={() => setBulk(false)} />
            </FormDrawer>

            <FormDrawer open={!!editing} onClose={() => setEditing(null)} title="Edit symbol">
                {editing && (
                    <SymbolForm initial={editing} loading={updateMut.isPending} onSubmit={handleUpdate} onCancel={() => setEditing(null)} />
                )}
            </FormDrawer>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Delete symbol"
                description={pendingDelete ? `"${pendingDelete.symbol}" will be removed from your catalogue.` : undefined}
                confirmLabel="Delete"
                danger
                loading={deleteMut.isPending}
                onConfirm={handleDelete}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
}
