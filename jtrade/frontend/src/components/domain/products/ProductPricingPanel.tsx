import * as React from "react";
import { Box, Button, Checkbox, Chip, FormControlLabel, IconButton, MenuItem, Stack, TextField, Tooltip, Typography } from "@mui/material";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { useCreateProductPricing, useDeactivateProductPricing, useProductPricing, useUpdateProductPricing } from "@/hooks/api/useProductPricing";
import { formatPrice, type ProductPricing, type ProductPricingPayload } from "@/types/products";

const empty: ProductPricingPayload = {
    key: "", name: "", pricingType: "one_time", amount: 0, currency: "USD", interval: null, intervalCount: null,
    trialEnabled: false, trialDays: 0, promotion: null, status: "active", isDefault: false, displayOrder: 0,
};
const dollars = (cents: number) => (cents / 100).toFixed(2);
const cents = (value: string) => Math.round((Number(value) || 0) * 100);
const dateValue = (value?: string | null) => value ? new Date(value).toISOString().slice(0, 10) : "";

export default function ProductPricingPanel({ productId }: { productId: string }) {
    const query = useProductPricing(productId);
    const create = useCreateProductPricing(productId);
    const update = useUpdateProductPricing(productId);
    const deactivate = useDeactivateProductPricing(productId);
    const [editing, setEditing] = React.useState<ProductPricing | null>(null);
    const [form, setForm] = React.useState<ProductPricingPayload>(empty);
    const [amount, setAmount] = React.useState("0.00");
    const [promotionValue, setPromotionValue] = React.useState("0");
    const set = <K extends keyof ProductPricingPayload>(key: K, value: ProductPricingPayload[K]) => setForm((current) => ({ ...current, [key]: value }));

    const reset = () => { setEditing(null); setForm(empty); setAmount("0.00"); setPromotionValue("0"); };
    const edit = (option: ProductPricing) => {
        setEditing(option);
        setForm({
            key: option.key, name: option.name, pricingType: option.pricingType, amount: option.amount, currency: "USD",
            interval: option.interval, intervalCount: option.intervalCount, trialEnabled: option.trialEnabled, trialDays: option.trialDays,
            promotion: option.promotion, status: option.status, isDefault: option.isDefault, displayOrder: option.displayOrder,
        });
        setAmount(dollars(option.amount));
        setPromotionValue(option.promotion?.type === "percentage" ? String(option.promotion.value) : dollars(option.promotion?.value ?? 0));
    };
    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        const payload = { ...form, amount: cents(amount) };
        if (payload.amount === 0) { payload.trialEnabled = false; payload.trialDays = 0; }
        if (payload.pricingType === "one_time") { payload.interval = null; payload.intervalCount = null; }
        if (payload.promotion) payload.promotion = {
            ...payload.promotion,
            value: payload.promotion.type === "percentage" ? Math.round(Number(promotionValue) || 0) : cents(promotionValue),
        };
        if (editing) await update.mutateAsync({ id: editing._id, data: payload }); else await create.mutateAsync(payload);
        reset();
    };
    const suffix = (option: ProductPricing) => option.pricingType === "recurring"
        ? ` / ${option.intervalCount && option.intervalCount > 1 ? `${option.intervalCount} ` : ""}${option.interval}${option.intervalCount && option.intervalCount > 1 ? "s" : ""}` : "";

    return <Stack spacing={2}>
        <Stack spacing={1}>
            {(query.data ?? []).map((option) => <Box key={option._id} sx={{ border: 1, borderColor: "divider", borderRadius: 2, p: 1.5 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                            <Typography fontWeight={800}>{option.name}</Typography>
                            {option.isDefault && <Chip size="small" label="Default" color="primary" />}
                            <Chip size="small" variant="outlined" label={option.status} />
                        </Stack>
                        <Typography variant="body2" color="text.secondary">
                            {option.hasActivePromotion && <Box component="span" sx={{ textDecoration: "line-through", mr: 1 }}>{formatPrice(option.amount)}</Box>}
                            <Box component="span" fontWeight={700}>{formatPrice(option.effectiveAmount)}{suffix(option)}</Box>
                            {option.trialEnabled && ` · ${option.trialDays}-day trial`}
                        </Typography>
                        <Typography variant="caption" fontFamily="monospace">{option.key}</Typography>
                    </Box>
                    <Stack direction="row">
                        <Tooltip title="Edit"><IconButton onClick={() => edit(option)}><EditOutlinedIcon fontSize="small" /></IconButton></Tooltip>
                        <Tooltip title="Deactivate"><span><IconButton disabled={option.status === "inactive"} onClick={() => deactivate.mutate(option._id)}><DeleteOutlineIcon fontSize="small" /></IconButton></span></Tooltip>
                    </Stack>
                </Stack>
            </Box>)}
            {!query.isFetching && !(query.data ?? []).length && <Typography color="text.secondary">No pricing options yet.</Typography>}
        </Stack>

        <Box component="form" onSubmit={submit}>
            <Typography variant="subtitle2" fontWeight={800} mb={1}>{editing ? "Edit pricing option" : "New pricing option"}</Typography>
            <Stack spacing={1.5}>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField required fullWidth size="small" label="Name" value={form.name} onChange={(e) => set("name", e.target.value)} />
                    <TextField required fullWidth size="small" label="Key" value={form.key} onChange={(e) => set("key", e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))} />
                </Stack>
                <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                    <TextField select fullWidth size="small" label="Type" value={form.pricingType} onChange={(e) => set("pricingType", e.target.value as ProductPricingPayload["pricingType"])}>
                        <MenuItem value="one_time">One-time</MenuItem><MenuItem value="recurring">Recurring</MenuItem>
                    </TextField>
                    <TextField required fullWidth size="small" type="number" label="Price (USD)" value={amount} inputProps={{ min: 0, step: "0.01" }} onChange={(e) => setAmount(e.target.value)} />
                </Stack>
                {form.pricingType === "recurring" && <Stack direction="row" spacing={1.5}>
                    <TextField select fullWidth size="small" label="Interval" value={form.interval ?? "month"} onChange={(e) => set("interval", e.target.value as "month" | "year")}>
                        <MenuItem value="month">Month</MenuItem><MenuItem value="year">Year</MenuItem>
                    </TextField>
                    <TextField fullWidth size="small" type="number" label="Every" value={form.intervalCount ?? 1} inputProps={{ min: 1, max: 120 }} onChange={(e) => set("intervalCount", Number(e.target.value))} />
                </Stack>}
                <Stack direction="row" spacing={1.5} alignItems="center">
                    <FormControlLabel control={<Checkbox checked={form.trialEnabled} disabled={cents(amount) === 0} onChange={(e) => set("trialEnabled", e.target.checked)} />} label="Free trial" />
                    {form.trialEnabled && <TextField size="small" type="number" label="Trial days" value={form.trialDays} inputProps={{ min: 1, max: 365 }} onChange={(e) => set("trialDays", Number(e.target.value))} />}
                    <FormControlLabel control={<Checkbox checked={form.isDefault} onChange={(e) => set("isDefault", e.target.checked)} />} label="Default" />
                </Stack>
                <FormControlLabel control={<Checkbox checked={!!form.promotion} onChange={(e) => set("promotion", e.target.checked ? { type: "percentage", value: 0, startsAt: null, endsAt: null, isActive: true } : null)} />} label="Promotion" />
                {form.promotion && <Stack spacing={1.5}>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                        <TextField select fullWidth size="small" label="Promotion type" value={form.promotion.type} onChange={(e) => set("promotion", { ...form.promotion!, type: e.target.value as any })}>
                            <MenuItem value="percentage">Percentage off</MenuItem><MenuItem value="fixed_amount">Fixed discount</MenuItem><MenuItem value="direct_price">Promotional price</MenuItem>
                        </TextField>
                        <TextField fullWidth size="small" type="number" label={form.promotion.type === "percentage" ? "Percent" : "USD"} value={promotionValue} inputProps={{ min: 0, step: form.promotion.type === "percentage" ? 1 : "0.01" }} onChange={(e) => setPromotionValue(e.target.value)} />
                    </Stack>
                    <Stack direction="row" spacing={1.5}>
                        <TextField fullWidth size="small" type="date" label="Starts" InputLabelProps={{ shrink: true }} value={dateValue(form.promotion.startsAt)} onChange={(e) => set("promotion", { ...form.promotion!, startsAt: e.target.value || null })} />
                        <TextField fullWidth size="small" type="date" label="Ends" InputLabelProps={{ shrink: true }} value={dateValue(form.promotion.endsAt)} onChange={(e) => set("promotion", { ...form.promotion!, endsAt: e.target.value || null })} />
                    </Stack>
                </Stack>}
                <Stack direction="row" justifyContent="flex-end" spacing={1}>
                    {editing && <Button onClick={reset}>Cancel</Button>}
                    <LoadingButton type="submit" variant="contained" loading={create.isPending || update.isPending}>{editing ? "Save changes" : "Create option"}</LoadingButton>
                </Stack>
            </Stack>
        </Box>
    </Stack>;
}
