import { useEffect, useMemo, useState } from "react";
import { Alert, Box, Button, Chip, CircularProgress, Divider, Drawer, IconButton, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Tooltip, Typography, useMediaQuery, useTheme } from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";
import { api } from "@/lib/http";

type Entry = { _id?: string; id?: string; name: string };
type Product = { _id: string; key: string; name: string; description: string; status: string; typeProjectId?: Entry; platforms: Array<{ platformId?: Entry }> };
type Form = { key: string; name: string; description: string; typeProjectId: string; platformId: string };
const EMPTY: Form = { key: "", name: "", description: "", typeProjectId: "", platformId: "" };
const STATUSES = ["draft", "pending_review", "published", "suspended", "archived"];
const list = <T,>(response: any): T[] => { const value = response?.data?.data ?? response?.data; return Array.isArray(value) ? value : []; };
const id = (entry?: Entry) => String(entry?.id ?? entry?._id ?? "");
const statusColor = (status: string): "success" | "warning" | "error" | "default" => status === "published" ? "success" : status === "pending_review" ? "warning" : status === "suspended" ? "error" : "default";

export default function ProductsPage({ review = false }: { review?: boolean }) {
    const theme = useTheme();
    const mobile = useMediaQuery(theme.breakpoints.down("md"));
    const [products, setProducts] = useState<Product[]>([]);
    const [types, setTypes] = useState<Entry[]>([]);
    const [platforms, setPlatforms] = useState<Entry[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [drawer, setDrawer] = useState(false);
    const [editing, setEditing] = useState<Product | null>(null);
    const [form, setForm] = useState<Form>(EMPTY);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");
    const [typeId, setTypeId] = useState("");
    const [platformId, setPlatformId] = useState("");

    const load = () => {
        setLoading(true); setError(null);
        return Promise.all([api.get(review ? "/products/review" : "/products/mine"), api.get("/type-projects/active"), api.get("/platforms?supported=true")])
            .then(([p, t, pl]) => { setProducts(list<Product>(p)); setTypes(list<Entry>(t)); setPlatforms(list<Entry>(pl)); })
            .catch(reason => setError(reason?.response?.data?.message ?? "Products could not be loaded."))
            .finally(() => setLoading(false));
    };
    useEffect(() => { void load(); }, [review]);

    const filtered = useMemo(() => products.filter(product => {
        const term = search.trim().toLowerCase();
        return (!term || [product.name, product.key, product.description].some(value => value?.toLowerCase().includes(term)))
            && (!status || product.status === status)
            && (!typeId || id(product.typeProjectId) === typeId)
            && (!platformId || product.platforms?.some(item => id(item.platformId) === platformId));
    }), [products, search, status, typeId, platformId]);

    const openCreate = () => { setEditing(null); setForm(EMPTY); setFormError(null); setDrawer(true); };
    const openEdit = (product: Product) => { setEditing(product); setForm({ key: product.key, name: product.name, description: product.description ?? "", typeProjectId: id(product.typeProjectId), platformId: id(product.platforms?.[0]?.platformId) }); setFormError(null); setDrawer(true); };
    const close = () => { if (saving) return; setDrawer(false); setEditing(null); setForm(EMPTY); setFormError(null); };
    const save = async () => {
        setSaving(true); setFormError(null);
        const payload = { key: form.key.trim(), name: form.name.trim(), description: form.description.trim(), typeProjectId: form.typeProjectId, platforms: form.platformId ? [{ platformId: form.platformId }] : [] };
        try { if (editing) await api.patch(`/products/${editing._id}`, payload); else await api.post("/products", payload); setDrawer(false); setEditing(null); setForm(EMPTY); await load(); }
        catch (reason: any) { setFormError(reason?.response?.data?.message ?? "The product could not be saved."); }
        finally { setSaving(false); }
    };
    const reviewProduct = async (productId: string, next: "published" | "suspended") => { await api.patch(`/products/${productId}/review/${next}`); await load(); };
    const clear = () => { setSearch(""); setStatus(""); setTypeId(""); setPlatformId(""); };
    const hasFilters = Boolean(search || status || typeId || platformId);

    return <Box sx={{ p: { xs: 2, md: 4, xl: 5 }, overflow: "auto", height: "100%", boxSizing: "border-box" }}>
        <Box sx={{ mb: 3.5 }}>
            <Typography color="primary.main" fontSize={11} fontWeight={800} letterSpacing=".13em" textTransform="uppercase">Provider workspace</Typography>
            <Typography variant="h3" sx={{ mt: .75, fontSize: { xs: 34, md: 44 }, fontWeight: 900, letterSpacing: "-.05em" }}>{review ? "Product review" : "Products"}</Typography>
            <Typography color="text.secondary" mt={.5}>{review ? "Review products submitted by provider organizations." : "Create and manage the products owned by your provider organization."}</Typography>
        </Box>

        <Paper variant="outlined" sx={{ borderRadius: { xs: 3, md: "28px" }, overflow: "hidden", boxShadow: "none", p: { xs: 2, md: 3 } }}>
            <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "flex-start" }} gap={2} mb={2.5}>
                <Box><Typography variant="h6" fontWeight={900}>Product catalogue</Typography><Typography variant="body2" color="text.secondary">{products.length} products total, {filtered.length} matching current filters</Typography></Box>
                <Stack direction="row" gap={1}><Tooltip title="Reload"><span><IconButton onClick={() => void load()} disabled={loading} sx={{ bgcolor: "action.hover" }}><RefreshRoundedIcon /></IconButton></span></Tooltip>{!review && <Button variant="contained" startIcon={<AddRoundedIcon />} onClick={openCreate} sx={{ borderRadius: 3, px: 2 }}>New product</Button>}</Stack>
            </Stack>

            <Box sx={{ p: { xs: 1.5, md: 2 }, mb: 2.5, border: "1px solid", borderColor: "divider", borderRadius: "18px", bgcolor: "action.hover" }}>
            <Stack direction={{ xs: "column", lg: "row" }} spacing={1.5}>
                <TextField size="small" label="Search" placeholder="Name, key or description" value={search} onChange={e => setSearch(e.target.value)} sx={{ flex: 1, minWidth: 220 }} />
                <TextField select size="small" label="Status" value={status} onChange={e => setStatus(e.target.value)} sx={{ minWidth: 170 }}><MenuItem value="">All statuses</MenuItem>{STATUSES.map(value => <MenuItem key={value} value={value}>{value.replaceAll("_", " ")}</MenuItem>)}</TextField>
                <TextField select size="small" label="Product type" value={typeId} onChange={e => setTypeId(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All types</MenuItem>{types.map(item => <MenuItem key={id(item)} value={id(item)}>{item.name}</MenuItem>)}</TextField>
                <TextField select size="small" label="Platform" value={platformId} onChange={e => setPlatformId(e.target.value)} sx={{ minWidth: 180 }}><MenuItem value="">All platforms</MenuItem>{platforms.map(item => <MenuItem key={id(item)} value={id(item)}>{item.name}</MenuItem>)}</TextField>
                {hasFilters && <Button color="inherit" onClick={clear}>Clear</Button>}
            </Stack>
            </Box>

        {loading && <Stack alignItems="center" py={8}><CircularProgress /><Typography color="text.secondary" mt={2}>Loading products…</Typography></Stack>}
        {error && <Alert severity="error" action={<Button color="inherit" size="small" onClick={() => void load()}>Retry</Button>}>{error}</Alert>}
        {!loading && !error && <TableContainer sx={{ mx: { xs: -2, md: -3 }, width: { xs: "calc(100% + 32px)", md: "calc(100% + 48px)" } }}><Table sx={{ minWidth: 760 }}><TableHead><TableRow sx={{ bgcolor: "action.hover", "& th": { py: 1.75, fontSize: 10, color: "text.secondary", textTransform: "uppercase", letterSpacing: ".08em", fontWeight: 800 } }}><TableCell>Product</TableCell><TableCell>Type</TableCell><TableCell>Platforms</TableCell><TableCell>Status</TableCell><TableCell align="right">Actions</TableCell></TableRow></TableHead>
                <TableBody>{filtered.map(product => <TableRow key={product._id} hover>
                    <TableCell><Typography fontWeight={800}>{product.name}</Typography><Typography variant="caption" color="text.secondary">{product.key}</Typography></TableCell>
                    <TableCell>{product.typeProjectId?.name ?? "—"}</TableCell>
                    <TableCell><Stack direction="row" gap={0.75} flexWrap="wrap">{product.platforms?.length ? product.platforms.map((entry, index) => <Chip key={index} size="small" variant="outlined" label={entry.platformId?.name ?? "Platform"} />) : "—"}</Stack></TableCell>
                    <TableCell><Chip size="small" color={statusColor(product.status)} label={product.status.replaceAll("_", " ")} /></TableCell>
                    <TableCell align="right">{review ? <Stack direction="row" gap={1} justifyContent="flex-end"><Button size="small" variant="contained" color="success" onClick={() => void reviewProduct(product._id, "published")}>Publish</Button><Button size="small" color="warning" onClick={() => void reviewProduct(product._id, "suspended")}>Suspend</Button></Stack> : <Tooltip title="Edit product"><IconButton size="small" onClick={() => openEdit(product)}><EditRoundedIcon fontSize="small" /></IconButton></Tooltip>}</TableCell>
                </TableRow>)}{filtered.length === 0 && <TableRow><TableCell colSpan={5} align="center" sx={{ py: 7 }}><Typography fontWeight={800}>{hasFilters ? "No products match the filters" : "No products yet"}</Typography><Typography variant="body2" color="text.secondary">{hasFilters ? "Change or clear the filters." : "Create the first product for this provider organization."}</Typography></TableCell></TableRow>}</TableBody>
            </Table></TableContainer>}
        </Paper>

        <Drawer anchor={mobile ? "bottom" : "right"} open={drawer} onClose={close} PaperProps={{ sx: { width: mobile ? "100%" : 480, maxWidth: "100%", height: mobile ? "90vh" : "100%", border: 0, borderRadius: mobile ? "24px 24px 0 0" : 0, boxShadow: "-20px 0 60px rgba(20,18,45,.18)" } }}>
            <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
                <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ p: 3 }}><Box><Typography variant="h5" fontWeight={900}>{editing ? "Edit product" : "New product"}</Typography><Typography variant="body2" color="text.secondary">Define the product and its trading platform.</Typography></Box><IconButton onClick={close}><CloseRoundedIcon /></IconButton></Stack><Divider />
                <Stack spacing={2} sx={{ p: 3, flex: 1, overflowY: "auto" }}>{formError && <Alert severity="error">{formError}</Alert>}<TextField label="Product name" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /><TextField label="Key" required value={form.key} onChange={e => setForm({ ...form, key: e.target.value })} helperText="Stable identifier, for example: trend-bot." /><TextField select label="Product type" required value={form.typeProjectId} onChange={e => setForm({ ...form, typeProjectId: e.target.value })}>{types.map(item => <MenuItem key={id(item)} value={id(item)}>{item.name}</MenuItem>)}</TextField><TextField select label="Initial platform" value={form.platformId} onChange={e => setForm({ ...form, platformId: e.target.value })}><MenuItem value="">No platform</MenuItem>{platforms.map(item => <MenuItem key={id(item)} value={id(item)}>{item.name}</MenuItem>)}</TextField><TextField label="Description" multiline minRows={5} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></Stack>
                <Divider /><Stack direction="row" justifyContent="flex-end" spacing={1} sx={{ p: 2.5 }}><Button color="inherit" onClick={close} disabled={saving}>Cancel</Button><Button variant="contained" onClick={() => void save()} disabled={saving || !form.name.trim() || !form.key.trim() || !form.typeProjectId}>{saving ? "Saving…" : editing ? "Save changes" : "Create draft"}</Button></Stack>
            </Box>
        </Drawer>
    </Box>;
}
