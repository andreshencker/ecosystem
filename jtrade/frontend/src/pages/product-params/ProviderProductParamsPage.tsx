import * as React from "react";
import { useSearchParams } from "react-router-dom";
import {
    Box, Button, Checkbox, FormControl, FormControlLabel, IconButton, InputLabel, MenuItem, Select, Stack,
    Table, TableBody, TableCell, TableHead, TableRow, TextField, Tooltip, Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";

import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { FormDrawer } from "@/components/shared/FormDrawer";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { LoadingButton } from "@/components/shared/LoadingButton";
import ProductParamsForm, { defaultValues } from "@/components/domain/products/ProductParamsForm";

import { useProducts, useUpdateProduct } from "@/hooks/api/useProducts";
import type { ProductParam, ProductParamInput, ProductParamRepeat, ProductParamType } from "@/types/products";

const TYPE_LABEL: Record<ProductParamType, string> = {
    number: "Number",
    boolean: "Yes / No",
    string: "Text",
    list: "List",
};
const REPEAT_LABEL: Record<ProductParamRepeat, string> = {
    once: "Once per account",
    "per-symbol": "Per symbol",
};
const RESERVED = ["productId", "codeVersion", "account", "commRoute", "subscriptionActive"];

const coerceDefault = (type: ProductParamType, raw: string): unknown => {
    if (raw === "") return null;
    if (type === "number") return Number(raw);
    if (type === "boolean") return ["true", "1", "yes"].includes(raw.toLowerCase());
    return raw;
};
const showDefault = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : String(v));

const toInput = (p: ProductParam): ProductParamInput => ({
    key: p.key, label: p.label, type: p.type, defaultValue: p.defaultValue, required: p.required,
    repeat: p.repeat, group: p.group,
    ...(p.min != null ? { min: p.min } : {}),
    ...(p.max != null ? { max: p.max } : {}),
    ...(p.options.length ? { options: p.options } : {}),
});

const emptyDraft = {
    key: "", label: "", type: "number" as ProductParamType, def: "", required: false,
    repeat: "per-symbol" as ProductParamRepeat, group: "", min: "", max: "", options: "",
};
type Draft = typeof emptyDraft;

export default function ProviderProductParamsPage() {
    const q = useProducts("mine");
    const update = useUpdateProduct();
    const products = q.data ?? [];

    const [searchParams, setSearchParams] = useSearchParams();
    const [selectedId, setSelectedId] = React.useState(searchParams.get("product") ?? "");
    React.useEffect(() => {
        if (products.length === 0) return;
        if (!products.some((p) => p._id === selectedId)) setSelectedId(products[0]._id);
    }, [products, selectedId]);

    const product = products.find((p) => p._id === selectedId) ?? null;
    const params = product?.params ?? [];

    const [drawerOpen, setDrawerOpen] = React.useState(false);
    const [editingKey, setEditingKey] = React.useState<string | null>(null);
    const [draft, setDraft] = React.useState<Draft>(emptyDraft);
    const [error, setError] = React.useState("");
    const [pendingDelete, setPendingDelete] = React.useState<ProductParam | null>(null);

    const [previewOpen, setPreviewOpen] = React.useState(false);
    const [pvAccount, setPvAccount] = React.useState<Record<string, unknown>>({});
    const [pvSymbol, setPvSymbol] = React.useState<Record<string, unknown>>({});
    const openPreview = () => {
        setPvAccount(defaultValues(params, "once"));
        setPvSymbol(defaultValues(params, "per-symbol"));
        setPreviewOpen(true);
    };
    const hasAccount = params.some((p) => p.repeat === "once");
    const hasSymbol = params.some((p) => p.repeat === "per-symbol");

    const pick = (id: string) => {
        setSelectedId(id);
        setSearchParams((prev) => { const n = new URLSearchParams(prev); id ? n.set("product", id) : n.delete("product"); return n; }, { replace: true });
        setDrawerOpen(false);
    };

    const openAdd = () => { setEditingKey(null); setDraft(emptyDraft); setError(""); setDrawerOpen(true); };
    const openEdit = (p: ProductParam) => {
        setEditingKey(p.key);
        setDraft({
            key: p.key, label: p.label, type: p.type,
            def: p.defaultValue == null ? "" : String(p.defaultValue),
            required: p.required,
            repeat: p.repeat, group: p.group,
            min: p.min == null ? "" : String(p.min),
            max: p.max == null ? "" : String(p.max),
            options: p.options.join(", "),
        });
        setError("");
        setDrawerOpen(true);
    };

    const save = (next: ProductParamInput[], after: () => void) => {
        if (!product) return;
        update.mutate({ id: product._id, data: { params: next } }, { onSuccess: after });
    };

    const submit = () => {
        if (!product) return;
        const k = draft.key.trim();
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(k)) { setError("Name must be one word: letters, digits, underscore."); return; }
        if (RESERVED.includes(k) || k.startsWith("signal.")) { setError(`"${k}" is a reserved name.`); return; }
        if (params.some((p) => p.key === k && p.key !== editingKey)) { setError("A parameter with that name already exists."); return; }
        if (!draft.label.trim()) { setError("Label is required."); return; }
        const opts = draft.options.split(",").map((o) => o.trim()).filter(Boolean);
        if (draft.type === "list" && opts.length === 0) { setError("A list needs at least one option."); return; }

        const row: ProductParamInput = {
            key: k, label: draft.label.trim(), type: draft.type,
            defaultValue: coerceDefault(draft.type, draft.def.trim()),
            required: draft.required,
            repeat: draft.repeat,
            group: draft.group.trim(),
            ...(draft.type === "number" && draft.min !== "" ? { min: Number(draft.min) } : {}),
            ...(draft.type === "number" && draft.max !== "" ? { max: Number(draft.max) } : {}),
            ...(draft.type === "list" ? { options: opts } : {}),
        };
        const base = params.map(toInput);
        const next = editingKey ? base.map((p) => (p.key === editingKey ? row : p)) : [...base, row];
        save(next, () => setDrawerOpen(false));
    };

    const confirmDelete = () => {
        if (!pendingDelete) return;
        save(params.filter((p) => p.key !== pendingDelete.key).map(toInput), () => setPendingDelete(null));
    };

    return (
        <>
            <PageHeader
                title="Product parameters"
                subtitle="The variables your code needs. The client fills them at purchase — jtrade only stores and forwards them."
                actions={
                    <Stack direction="row" spacing={1}>
                        <Button
                            variant="outlined" startIcon={<VisibilityOutlinedIcon />} onClick={openPreview}
                            disabled={!product || params.length === 0}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                            Preview form
                        </Button>
                        <LoadingButton
                            variant="contained" startIcon={<AddIcon />} onClick={openAdd}
                            disabled={!product}
                            sx={{ textTransform: "none", fontWeight: 700 }}
                        >
                            Add parameter
                        </LoadingButton>
                    </Stack>
                }
            />

            {products.length === 0 ? (
                <EmptyState title="No products yet" description="Create a product first." />
            ) : (
                <>
                    <FormControl size="small" sx={{ minWidth: 260, mb: 2 }}>
                        <InputLabel>Product</InputLabel>
                        <Select value={selectedId} label="Product" onChange={(e) => pick(e.target.value)}>
                            {products.map((p) => <MenuItem key={p._id} value={p._id}>{p.name}</MenuItem>)}
                        </Select>
                    </FormControl>

                    {params.length === 0 ? (
                        <EmptyState title="No parameters on this product" description="Add the first one with the button above." />
                    ) : (
                        <Table
                            size="small"
                            sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, borderCollapse: "separate", "& td, & th": { borderColor: "divider" } }}
                        >
                            <TableHead>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
                                    <TableCell sx={{ fontWeight: 700 }}>Label</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 120 }}>Repeat</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 130 }}>Group</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 120 }}>Type</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 90 }}>Default</TableCell>
                                    <TableCell sx={{ fontWeight: 700, width: 80 }}>Req.</TableCell>
                                    <TableCell sx={{ width: 92 }} />
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {params.map((p) => (
                                    <TableRow key={p.key} hover>
                                        <TableCell sx={{ fontFamily: "monospace", fontWeight: 600 }}>{p.key}</TableCell>
                                        <TableCell>{p.label}</TableCell>
                                        <TableCell>{REPEAT_LABEL[p.repeat]}</TableCell>
                                        <TableCell>{p.group || "—"}</TableCell>
                                        <TableCell>{TYPE_LABEL[p.type]}{p.type === "list" && p.options.length ? ` (${p.options.join(", ")})` : ""}</TableCell>
                                        <TableCell>{showDefault(p.defaultValue)}</TableCell>
                                        <TableCell>{p.required ? "Yes" : "No"}</TableCell>
                                        <TableCell align="right" sx={{ whiteSpace: "nowrap" }}>
                                            <Tooltip title="Edit">
                                                <IconButton size="small" onClick={() => openEdit(p)}><EditOutlinedIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                            <Tooltip title="Remove">
                                                <IconButton size="small" onClick={() => setPendingDelete(p)}><DeleteOutlineIcon fontSize="small" /></IconButton>
                                            </Tooltip>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </>
            )}

            <FormDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                title={editingKey ? `Edit "${editingKey}"` : "Add parameter"}
                width={460}
            >
                <Stack spacing={2}>
                    <TextField label="Name" value={draft.key} disabled={!!editingKey}
                        onChange={(e) => { setDraft((d) => ({ ...d, key: e.target.value })); setError(""); }}
                        placeholder="riskPercent" fullWidth InputLabelProps={{ shrink: true }}
                        helperText="One word: letters, digits, underscore. This is the name your code reads." />

                    <TextField label="Label" value={draft.label}
                        onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                        placeholder="Risk per trade (%)" fullWidth InputLabelProps={{ shrink: true }}
                        helperText="What the client sees in the form." />

                    <TextField select label="Type" value={draft.type}
                        onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value as ProductParamType }))}
                        fullWidth InputLabelProps={{ shrink: true }}>
                        {(Object.keys(TYPE_LABEL) as ProductParamType[]).map((t) => (
                            <MenuItem key={t} value={t}>{TYPE_LABEL[t]}</MenuItem>
                        ))}
                    </TextField>

                    <TextField select label="Repeat" value={draft.repeat}
                        onChange={(e) => setDraft((d) => ({ ...d, repeat: e.target.value as ProductParamRepeat }))}
                        fullWidth InputLabelProps={{ shrink: true }}
                        helperText="Once per account, or one value per symbol + timeframe.">
                        <MenuItem value="once">Once per account</MenuItem>
                        <MenuItem value="per-symbol">Per symbol</MenuItem>
                    </TextField>

                    <TextField label="Group" value={draft.group}
                        onChange={(e) => setDraft((d) => ({ ...d, group: e.target.value }))}
                        placeholder="Risk management" fullWidth InputLabelProps={{ shrink: true }}
                        helperText="Section header in the client's form (optional)." />

                    <TextField label="Default value" value={draft.def}
                        onChange={(e) => setDraft((d) => ({ ...d, def: e.target.value }))}
                        fullWidth InputLabelProps={{ shrink: true }} />

                    {draft.type === "number" && (
                        <Stack direction="row" spacing={2}>
                            <TextField label="Minimum" type="number" value={draft.min}
                                onChange={(e) => setDraft((d) => ({ ...d, min: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                            <TextField label="Maximum" type="number" value={draft.max}
                                onChange={(e) => setDraft((d) => ({ ...d, max: e.target.value }))} fullWidth InputLabelProps={{ shrink: true }} />
                        </Stack>
                    )}

                    {draft.type === "list" && (
                        <TextField label="Options (comma-separated)" value={draft.options}
                            onChange={(e) => setDraft((d) => ({ ...d, options: e.target.value }))}
                            placeholder="fixed, risk-based, atr" fullWidth InputLabelProps={{ shrink: true }} />
                    )}

                    <FormControlLabel
                        control={<Checkbox checked={draft.required} onChange={(e) => setDraft((d) => ({ ...d, required: e.target.checked }))} />}
                        label="Required (the client must fill it)"
                    />

                    {error && <Typography variant="caption" color="error">{error}</Typography>}

                    <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ pt: 1 }}>
                        <Button variant="outlined" color="inherit" onClick={() => setDrawerOpen(false)}
                            sx={{ textTransform: "none", fontWeight: 800 }}>
                            Cancel
                        </Button>
                        <LoadingButton variant="contained" loading={update.isPending}
                            disabled={!draft.key.trim() || !draft.label.trim()}
                            onClick={submit} sx={{ textTransform: "none", fontWeight: 800 }}>
                            {editingKey ? "Save changes" : "Add"}
                        </LoadingButton>
                    </Stack>
                </Stack>
            </FormDrawer>

            <ConfirmDialog
                open={!!pendingDelete}
                title="Remove parameter"
                description={pendingDelete ? `"${pendingDelete.key}" will be removed from the product.` : undefined}
                confirmLabel="Remove"
                danger
                loading={update.isPending}
                onConfirm={confirmDelete}
                onCancel={() => setPendingDelete(null)}
            />

            <FormDrawer
                open={previewOpen}
                onClose={() => setPreviewOpen(false)}
                title="Form preview"
                width={480}
            >
                {product && (
                    <Stack spacing={3}>
                        <Typography variant="body2" color="text.secondary">
                            This is what the client sees when they configure “{product.name}”. Nothing here is saved.
                        </Typography>

                        {hasAccount && (
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1.5 }}>Account settings</Typography>
                                <ProductParamsForm
                                    params={product.params} repeat="once"
                                    values={pvAccount}
                                    onChange={(k, v) => setPvAccount((s) => ({ ...s, [k]: v }))}
                                />
                            </Box>
                        )}

                        {hasSymbol && (
                            <Box>
                                <Typography variant="subtitle2" fontWeight={800}>Per symbol</Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                                    The client fills this once for each symbol + timeframe they follow.
                                </Typography>
                                <ProductParamsForm
                                    params={product.params} repeat="per-symbol"
                                    values={pvSymbol}
                                    onChange={(k, v) => setPvSymbol((s) => ({ ...s, [k]: v }))}
                                />
                            </Box>
                        )}
                    </Stack>
                )}
            </FormDrawer>
        </>
    );
}
