import * as React from "react";
import { Box, Card, CardContent, Chip, CircularProgress, MenuItem, Stack, TextField, Typography } from "@mui/material";

import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { LoadingButton } from "@/components/shared/LoadingButton";

import { useMarketplaceProducts } from "@/hooks/api/useProducts";
import { useProductPricing } from "@/hooks/api/useProductPricing";
import { useCheckout, useMyOrders } from "@/hooks/api/useOrders";
import { formatPrice, refId, type Product } from "@/types/products";

function MarketplaceCard({ product, owned }: { product: Product; owned: boolean }) {
    const pricing = useProductPricing(product._id);
    const checkout = useCheckout();
    const options = pricing.data ?? [];
    const [selectedId, setSelectedId] = React.useState("");
    React.useEffect(() => {
        if (!selectedId && options.length) setSelectedId((options.find((option) => option.isDefault) ?? options[0])._id);
    }, [options, selectedId]);
    const selected = options.find((option) => option._id === selectedId) ?? null;
    const suffix = selected?.pricingType === "recurring" ? ` / ${selected.intervalCount && selected.intervalCount > 1 ? `${selected.intervalCount} ` : ""}${selected.interval}` : "";
    const hasTrial = !!selected?.trialEnabled && (selected?.trialDays ?? 0) > 0;
    const ctaLabel = owned
        ? "Already owned"
        : hasTrial
            ? `Start ${selected!.trialDays}-day free trial`
            : selected?.pricingType === "recurring"
                ? "Subscribe"
                : "Buy";

    return (
        <Card variant="outlined" sx={{ height: "100%", display: "flex", flexDirection: "column" }}>
            <CardContent sx={{ flex: 1 }}>
                <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: "wrap", gap: 0.5 }}>
                    <Chip size="small" variant="outlined" label={product.typeProductId?.name ?? "—"} />
                    <Chip size="small" variant="outlined" label={product.platformId?.name ?? "—"} />
                </Stack>
                <Typography variant="subtitle1" fontWeight={800}>{product.name}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>{product.description || "No description."}</Typography>

                {pricing.isFetching ? (
                    <CircularProgress size={16} />
                ) : selected ? (
                    <Stack spacing={1}>
                        {options.length > 1 && <TextField select size="small" label="Pricing option" value={selectedId} onChange={(event) => setSelectedId(event.target.value)}>
                            {options.map((option) => <MenuItem key={option._id} value={option._id}>{option.name}</MenuItem>)}
                        </TextField>}
                        <Stack direction="row" spacing={1} alignItems="baseline">
                        {selected.hasActivePromotion && (
                            <Typography variant="caption" color="text.secondary" sx={{ textDecoration: "line-through" }}>
                                {formatPrice(selected.amount, selected.currency)}
                            </Typography>
                        )}
                        <Typography variant="h6" fontWeight={800}>{formatPrice(selected.effectiveAmount, selected.currency)}{suffix}</Typography>
                        {hasTrial && (
                            <Typography variant="caption" color="info.main">{selected.trialDays}-day free trial</Typography>
                        )}
                        </Stack>
                    </Stack>
                ) : (
                    <Typography variant="body2" color="text.secondary">Not priced</Typography>
                )}
            </CardContent>
            <Box sx={{ p: 2, pt: 0 }}>
                <LoadingButton
                    fullWidth variant="contained"
                    loading={checkout.isPending}
                    disabled={owned || !selected}
                    onClick={() => selected && checkout.mutate({ productId: product._id, pricingId: selected._id })}
                    sx={{ textTransform: "none", fontWeight: 700 }}
                >
                    {ctaLabel}
                </LoadingButton>
            </Box>
        </Card>
    );
}

export default function ClientMarketplacePage() {
    const q = useMarketplaceProducts();
    const orders = useMyOrders();
    const products = q.data ?? [];

    const ownedProductIds = React.useMemo(
        () => new Set((orders.data ?? []).filter((o) => o.status === "active").map((o) => refId(typeof o.productId === "object" ? o.productId : undefined) || String(o.productId))),
        [orders.data],
    );

    return (
        <>
            <PageHeader title="Marketplace" count={products.length} subtitle="Products published by provider organizations." />

            {q.isFetching && products.length === 0 ? (
                <Box display="flex" justifyContent="center" py={8}><CircularProgress /></Box>
            ) : products.length === 0 ? (
                <EmptyState title="Nothing for sale yet" description="Published products from providers will show up here." />
            ) : (
                <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "1fr 1fr 1fr" }, gap: 2 }}>
                    {products.map((p) => (
                        <MarketplaceCard key={p._id} product={p} owned={ownedProductIds.has(p._id)} />
                    ))}
                </Box>
            )}
        </>
    );
}
