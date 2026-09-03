import * as React from "react";
import {
    Box,
    Chip,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import type { GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";

import { PageHeader } from "@/components/shared/PageHeader";
import { SearchToolbar } from "@/components/shared/SearchToolbar";
import { DataTable } from "@/components/shared/DataTable";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { EmptyState } from "@/components/shared/EmptyState";
import { useListState } from "@/hooks/useListState";
import {
    useAddPaymentMethod,
    useAdminPaymentMethods,
    useAvailablePaymentMethods,
    useRemovePaymentMethod,
    useUpsertPaymentMethod,
} from "@/hooks/api/usePaymentsAdmin";
import type { AdminPaymentMethod, SettingsFieldDef } from "@/types/payments-admin";

// ─── settings <-> form helpers ────────────────────────────────────────────────

function settingToInput(field: SettingsFieldDef, value: unknown): string {
    if (field.type === "country-list") return Array.isArray(value) ? value.join(", ") : "";
    return value === undefined || value === null ? "" : String(value);
}
function inputToSetting(field: SettingsFieldDef, raw: string): unknown {
    if (field.type === "country-list") {
        return raw.split(/[,\s]+/).map((c) => c.trim().toUpperCase()).filter(Boolean);
    }
    if (field.type === "number") return raw === "" ? undefined : Number(raw);
    return raw.trim();
}
function settingsComplete(m: AdminPaymentMethod): boolean {
    return m.settingsFields
        .filter((f) => f.required)
        .every((f) => {
            const v = m.settings[f.key];
            if (f.type === "country-list") return Array.isArray(v) && v.length > 0;
            return v !== undefined && v !== null && v !== "";
        });
}
function settingsSummary(m: AdminPaymentMethod): string {
    const parts: string[] = [];
    const c = m.settings["allowedCountries"];
    if (Array.isArray(c) && c.length) parts.push(c.join(", "));
    const fee = m.settings["platformFeePercent"];
    if (fee !== undefined && fee !== null && fee !== "") parts.push(`${fee}%`);
    return parts.join(" · ");
}

// ─── page ────────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
    const q = useAdminPaymentMethods();
    const available = useAvailablePaymentMethods();
    const add = useAddPaymentMethod();
    const save = useUpsertPaymentMethod();
    const remove = useRemovePaymentMethod();

    const rows = q.data ?? [];
    const list = useListState();
    const statusFilter = list.filters["status"] ?? "";

    const filtered = React.useMemo(() => {
        let r = rows;
        const query = list.debouncedSearch.trim().toLowerCase();
        if (query) r = r.filter((m) => m.displayName.toLowerCase().includes(query) || m.method.includes(query));
        if (statusFilter === "enabled") r = r.filter((m) => m.enabled);
        if (statusFilter === "disabled") r = r.filter((m) => !m.enabled);
        return r;
    }, [rows, list.debouncedSearch, statusFilter]);

    const [toAdd, setToAdd] = React.useState("");
    const [editing, setEditing] = React.useState<AdminPaymentMethod | null>(null);
    const [form, setForm] = React.useState<Record<string, string>>({});
    const [enabled, setEnabled] = React.useState(false);
    const [isRequired, setIsRequired] = React.useState(false);
    const [pendingDelete, setPendingDelete] = React.useState<AdminPaymentMethod | null>(null);

    const openConfig = (m: AdminPaymentMethod) => {
        setEditing(m);
        setEnabled(m.enabled);
        setIsRequired(m.isRequired);
        setForm(Object.fromEntries(m.settingsFields.map((f) => [f.key, settingToInput(f, m.settings[f.key])])));
    };
    const closeConfig = () => setEditing(null);

    const submitConfig = () => {
        if (!editing) return;
        const settings = Object.fromEntries(
            editing.settingsFields.map((f) => [f.key, inputToSetting(f, form[f.key] ?? "")]),
        );
        save.mutate(
            { method: editing.method, body: { settings, enabled, isRequired } },
            { onSuccess: () => closeConfig() },
        );
    };

    const handleAdd = () => {
        if (!toAdd) return;
        add.mutate(toAdd, { onSuccess: () => setToAdd("") });
    };

    // Open the config drawer as soon as a freshly-added row shows up.
    const justAdded = add.isSuccess ? (add.data as AdminPaymentMethod | undefined)?.method : undefined;
    React.useEffect(() => {
        if (!justAdded || editing) return;
        const row = rows.find((m) => m.method === justAdded);
        if (row) {
            openConfig(row);
            add.reset();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [rows, justAdded]);

    const columns: GridColDef<AdminPaymentMethod>[] = [
        {
            field: "displayName", headerName: "Method", flex: 1, minWidth: 160,
            renderCell: (p) => (
                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2">{p.row.displayName}</Typography>
                    {!p.row.supportedByRelay && (
                        <Chip size="small" color="warning" variant="outlined" label="Not in Relay" />
                    )}
                </Stack>
            ),
        },
        {
            field: "enabled", headerName: "Status", width: 120,
            renderCell: (p) => (
                <Chip size="small" variant="outlined" color={p.value ? "success" : "default"}
                    label={p.value ? "Enabled" : "Disabled"} />
            ),
        },
        {
            field: "isRequired", headerName: "Base", width: 90,
            renderCell: (p) => (p.value ? <Chip size="small" color="primary" label="Base" /> : null),
        },
        {
            field: "settings", headerName: "Configuration", flex: 1, minWidth: 180,
            renderCell: (p) => {
                const s = settingsSummary(p.row);
                return s ? (
                    <Typography variant="body2" color="text.secondary">{s}</Typography>
                ) : (
                    <Typography variant="body2" color="warning.main">Not configured</Typography>
                );
            },
        },
    ];

    return (
        <>
            <PageHeader
                title="Payments"
                count={rows.length}
                subtitle="Choose which of Relay's payment methods jtrade offers to providers, and set what each one needs."
                actions={
                    <Stack direction="row" spacing={1} alignItems="center">
                        <FormControl size="small" sx={{ minWidth: 200 }}>
                            <InputLabel>Add a method</InputLabel>
                            <Select
                                label="Add a method"
                                value={toAdd}
                                onChange={(e) => setToAdd(e.target.value)}
                                disabled={available.isLoading || (available.data ?? []).length === 0}
                            >
                                {(available.data ?? []).map((m) => (
                                    <MenuItem key={m.method} value={m.method}>{m.displayName}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <LoadingButton
                            variant="contained"
                            startIcon={<AddIcon />}
                            loading={add.isPending}
                            disabled={!toAdd}
                            onClick={handleAdd}
                        >
                            Add
                        </LoadingButton>
                    </Stack>
                }
            />

            <SearchToolbar
                search={list.search}
                onSearchChange={list.setSearch}
                placeholder="Search method…"
                hasActiveFilters={list.hasActiveFilters}
                onClearFilters={list.clearFilters}
            >
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={(e) => list.setFilter("status", e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="enabled">Enabled</MenuItem>
                        <MenuItem value="disabled">Disabled</MenuItem>
                    </Select>
                </FormControl>
            </SearchToolbar>

            <DataTable<AdminPaymentMethod>
                columns={columns}
                rows={filtered}
                total={filtered.length}
                page={0}
                pageSize={50}
                onPageChange={() => {}}
                onPageSizeChange={() => {}}
                loading={q.isFetching}
                getRowId={(row) => row.method}
                onRowClick={openConfig}
                error={q.isError ? (q.error as Error) : null}
                rowActions={(row) => (
                    <>
                        <Tooltip title="Configure">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); openConfig(row); }}>
                                <SettingsOutlinedIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setPendingDelete(row); }}>
                                <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </>
                )}
                emptyState={
                    list.hasActiveFilters ? (
                        <EmptyState title="No methods match your filters"
                            action={<LoadingButton variant="outlined" onClick={list.clearFilters}>Clear filters</LoadingButton>} />
                    ) : (
                        <EmptyState title="No payment methods added"
                            description="Pick one from “Add a method” above to start." />
                    )
                }
                mobileCardConfig={{
                    primaryText: "displayName",
                    secondaryText: "method",
                    badge: (row) => (
                        <Chip size="small" color={row.enabled ? "success" : "default"}
                            label={row.enabled ? "Enabled" : "Disabled"} />
                    ),
                    fields: [{ field: "settings", label: "Config", render: (_v, row) => settingsSummary(row) || "—" }],
                }}
            />

            <FormDrawer
                open={!!editing}
                onClose={closeConfig}
                title={editing ? `Configure ${editing.displayName}` : ""}
                width={520}
                actions={
                    <Stack direction="row" spacing={1} justifyContent="flex-end">
                        <LoadingButton onClick={closeConfig}>Cancel</LoadingButton>
                        <LoadingButton variant="contained" loading={save.isPending} onClick={submitConfig}>Save</LoadingButton>
                    </Stack>
                }
            >
                {editing && (
                    <Stack spacing={2.5}>
                        {editing.settingsFields.map((f) => (
                            <TextField
                                key={f.key}
                                label={f.label}
                                required={f.required}
                                helperText={
                                    f.type === "country-list"
                                        ? f.help ?? "2-letter codes, comma separated (e.g. US, GB, CO)"
                                        : f.help
                                }
                                value={form[f.key] ?? ""}
                                onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                                type={f.type === "number" ? "number" : "text"}
                                fullWidth
                                size="small"
                            />
                        ))}
                        {editing.settingsFields.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                This method has no settings to configure.
                            </Typography>
                        )}

                        <Box>
                            <FormControlLabel
                                control={<Switch checked={enabled} onChange={(e) => { setEnabled(e.target.checked); if (!e.target.checked) setIsRequired(false); }} />}
                                label="Offered to providers"
                            />
                            {enabled && (
                                <FormControlLabel
                                    sx={{ display: "block" }}
                                    control={<Switch checked={isRequired} onChange={(e) => setIsRequired(e.target.checked)} />}
                                    label="Required base method (providers must have this first)"
                                />
                            )}
                        </Box>

                        {editing.configurable && !settingsComplete({ ...editing, settings: Object.fromEntries(editing.settingsFields.map((f) => [f.key, inputToSetting(f, form[f.key] ?? "")])) }) && enabled && (
                            <Typography variant="caption" color="warning.main">
                                Fill the required settings above before enabling.
                            </Typography>
                        )}
                    </Stack>
                )}
            </FormDrawer>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Remove payment method"
                description={pendingDelete ? `Remove "${pendingDelete.displayName}" from jtrade's payment methods.` : undefined}
                confirmLabel="Remove"
                danger
                loading={remove.isPending}
                onConfirm={() => {
                    if (pendingDelete) remove.mutate(pendingDelete.method, { onSuccess: () => setPendingDelete(null) });
                }}
                onCancel={() => setPendingDelete(null)}
            />
        </>
    );
}
