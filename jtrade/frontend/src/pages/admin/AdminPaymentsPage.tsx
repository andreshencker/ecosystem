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
    Tab,
    Tabs,
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
import { CountryListField } from "./CountryListField";
import { ProviderPaymentsTab } from "./ProviderPaymentsTab";

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
/** "10% + $0.30" — the commission jtrade keeps on every sale. "—" if this method has no fee. */
function feeSummary(m: AdminPaymentMethod): string {
    const hasPct = m.settingsFields.some((f) => f.key === "platformFeePercent");
    if (!hasPct) return "—";
    const pct = m.settings["platformFeePercent"];
    if (pct === undefined || pct === null || pct === "") return "Not set";
    const fixed = Number(m.settings["platformFeeFixedMinor"] ?? 0);
    const fixedPart = fixed > 0 ? ` + $${(fixed / 100).toFixed(2)}` : "";
    return `${pct}%${fixedPart}`;
}

/** "12 countries" / "US, GB" / "All 44" / "Not set" */
function countriesSummary(m: AdminPaymentMethod): string {
    const hasField = m.settingsFields.some((f) => f.type === "country-list");
    if (!hasField) return "—";
    const c = m.settings["allowedCountries"];
    const list = Array.isArray(c) ? (c as string[]) : [];
    if (list.length === 0) return "Not set";
    if (list.length <= 3) return list.join(", ");
    return `${list.length} countries`;
}


// ─── page ────────────────────────────────────────────────────────────────────

export default function AdminPaymentsPage() {
    const [tab, setTab] = React.useState(0);
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
            field: "fee", headerName: "Platform fee", width: 140, sortable: false,
            valueGetter: (_v, row) => feeSummary(row),
            renderCell: (p) => {
                const s = feeSummary(p.row);
                if (s === "—") return <Typography variant="body2" color="text.disabled">—</Typography>;
                return (
                    <Typography variant="body2" color={s === "Not set" ? "warning.main" : "text.primary"}>
                        {s}
                    </Typography>
                );
            },
        },
        {
            field: "countries", headerName: "Countries", flex: 1, minWidth: 130, sortable: false,
            valueGetter: (_v, row) => countriesSummary(row),
            renderCell: (p) => {
                const s = countriesSummary(p.row);
                if (s === "—") return <Typography variant="body2" color="text.disabled">—</Typography>;
                return (
                    <Typography variant="body2" color={s === "Not set" ? "warning.main" : "text.secondary"}>
                        {s}
                    </Typography>
                );
            },
        },
    ];

    return (
        <>
            <PageHeader
                title="Payments"
                count={tab === 0 ? rows.length : undefined}
                subtitle="Choose which of Relay's payment methods jtrade offers to providers, and see how each provider's setup is going."
                actions={
                    tab === 0 ? (
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
                    ) : undefined
                }
            />

            <Tabs value={tab} onChange={(_e, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}>
                <Tab label="Methods" />
                <Tab label="Providers" />
            </Tabs>

            {tab === 1 && <ProviderPaymentsTab />}

            {tab === 0 && (
            <>
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
                    fields: [
                        { field: "settings", label: "Platform fee", render: (_v, row) => feeSummary(row) },
                        { field: "settings", label: "Countries", render: (_v, row) => countriesSummary(row) },
                    ],
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
                        {editing.settingsFields.map((f) =>
                            f.type === "country-list" ? (
                                <CountryListField
                                    key={f.key}
                                    label={f.label}
                                    required={f.required}
                                    help={f.help}
                                    value={form[f.key] ?? ""}
                                    onChange={(next) => setForm((s) => ({ ...s, [f.key]: next }))}
                                />
                            ) : (
                                <TextField
                                    key={f.key}
                                    label={f.label}
                                    required={f.required}
                                    helperText={f.help}
                                    value={form[f.key] ?? ""}
                                    onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))}
                                    type={f.type === "number" ? "number" : "text"}
                                    fullWidth
                                    size="small"
                                />
                            ),
                        )}
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
            )}
        </>
    );
}
