import * as React from "react";
import { Box, Divider, Stack, TextField, Typography } from "@mui/material";

import type { Product } from "@/types/products";
import { LabeledField } from "@/components/shared/FieldLabelWithHelp";
import { ProductImageField } from "./ProductImageField";

const slugify = (v: string) => v.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export const IDENTITY_LIMITS = { tagline: 120, taglineHint: 80, shortDescription: 200 };

const HELP = {
    name: (
        <>
            The public name customers will use to identify your product in JTrade.
            <br />
            <em>Example: “Blade Signals”.</em>
        </>
    ),
    key: (
        <>
            A unique identifier used internally and in URLs. It is generated automatically from the
            product name and cannot be changed after the product is created.
            <br />
            <em>Example: “blade-signals”.</em>
        </>
    ),
    tagline: (
        <>
            A short sentence that communicates the main value of your product. It may appear directly
            below the product name in Marketplace. It is not the full description.
            <br />
            <em>Example: “Trade smarter with real-time market signals.”</em>
        </>
    ),
    shortDescription: (
        <>
            A brief summary of what your product offers and who it is for. It may appear in Marketplace
            cards, search results and listing headers. Keep it different from the full description in
            the next step.
            <br />
            <em>Example: “Real-time Forex and Gold trading signals with configurable risk and
            execution preferences.”</em>
        </>
    ),
};

export type IdentityValues = {
    name: string;
    key: string;
    tagline: string;
    shortDescription: string;
    logoUrl: string;
    coverImageUrl: string;
};

type FieldKey = "name" | "key" | "shortDescription";

export function useIdentityForm(product: Product | null) {
    const [values, setValues] = React.useState<IdentityValues>({
        name: "", key: "", tagline: "", shortDescription: "", logoUrl: "", coverImageUrl: "",
    });
    const [keyTouched, setKeyTouched] = React.useState(false);
    const [touched, setTouched] = React.useState<Set<FieldKey>>(new Set());

    React.useEffect(() => {
        if (!product) return;
        setValues({
            name: product.name ?? "",
            key: product.key ?? "",
            tagline: product.tagline ?? "",
            shortDescription: product.shortDescription ?? "",
            logoUrl: product.logoUrl ?? "",
            coverImageUrl: product.coverImageUrl ?? "",
        });
        setKeyTouched(true);
    }, [product]);

    const effectiveKey = keyTouched ? values.key : slugify(values.name);
    const set = <K extends keyof IdentityValues>(k: K, v: IdentityValues[K]) => setValues((s) => ({ ...s, [k]: v }));

    const errors: Partial<Record<FieldKey, string>> = {};
    if (values.name.trim().length < 2) errors.name = "Product name is required (at least 2 characters).";
    if (slugify(effectiveKey).length < 2) errors.key = "Product key is required.";
    if (values.shortDescription.trim().length === 0) errors.shortDescription = "Short description is required.";

    const valid = Object.keys(errors).length === 0;

    const markTouched = (f: FieldKey) => setTouched((s) => new Set(s).add(f));
    const showAllErrors = () => setTouched(new Set<FieldKey>(["name", "key", "shortDescription"]));
    const errorFor = (f: FieldKey) => (touched.has(f) ? errors[f] : undefined);

    const payload = () => ({
        name: values.name.trim(),
        key: slugify(effectiveKey),
        tagline: values.tagline.trim().slice(0, IDENTITY_LIMITS.tagline),
        shortDescription: values.shortDescription.trim().slice(0, IDENTITY_LIMITS.shortDescription),
        logoUrl: values.logoUrl.trim(),
        coverImageUrl: values.coverImageUrl.trim(),
    });

    return { values, effectiveKey, set, setKeyTouched, valid, errors, errorFor, markTouched, showAllErrors, payload };
}

function CountedHelper({ error, value, max, hint }: { error?: string; value: string; max: number; hint?: number }) {
    const len = value.length;
    const over = hint != null && len > hint && len <= max;
    return (
        <Box component="span" sx={{ display: "flex", justifyContent: "space-between", gap: 1, width: "100%" }}>
            <Box component="span" sx={{ color: error ? "error.main" : "text.secondary" }}>{error ?? " "}</Box>
            <Box component="span" sx={{ flexShrink: 0, color: len > max ? "error.main" : over ? "warning.main" : "text.disabled" }}>
                {len}/{max}
            </Box>
        </Box>
    );
}

export default function IdentityStep({
    form,
    productId,
    isNew,
}: {
    form: ReturnType<typeof useIdentityForm>;
    productId: string | null;
    isNew: boolean;
}) {
    const { values, effectiveKey, set, setKeyTouched, errorFor, markTouched } = form;

    return (
        <Stack spacing={3.5} sx={{ maxWidth: 720 }}>
            {/* ── Basic information ─────────────────────────────────────────── */}
            <Box>
                <Typography variant="subtitle1" fontWeight={900}>Basic information</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Define the public, commercial identity of your product.
                </Typography>

                <Stack spacing={2.5}>
                    <LabeledField label="Product name" required help={HELP.name}>
                        <TextField
                            value={values.name} fullWidth size="small" hiddenLabel
                            placeholder="Blade Signals"
                            onChange={(e) => set("name", e.target.value)}
                            onBlur={() => markTouched("name")}
                            error={!!errorFor("name")}
                            helperText={errorFor("name") ?? " "}
                        />
                    </LabeledField>

                    <LabeledField label="Product key" required help={HELP.key}>
                        <TextField
                            value={effectiveKey} fullWidth size="small" hiddenLabel
                            placeholder="blade-signals"
                            disabled={!isNew}
                            onChange={(e) => { setKeyTouched(true); set("key", e.target.value); }}
                            onBlur={() => markTouched("key")}
                            error={!!errorFor("key")}
                            helperText={errorFor("key") ?? (isNew ? "Generated from the name. You can edit it until the product is created." : "The key is fixed after creation.")}
                        />
                    </LabeledField>

                    <LabeledField label="Tagline" help={HELP.tagline}>
                        <TextField
                            value={values.tagline} fullWidth size="small" hiddenLabel
                            placeholder="Trade smarter with real-time market signals."
                            onChange={(e) => set("tagline", e.target.value.slice(0, IDENTITY_LIMITS.tagline))}
                            helperText={<CountedHelper value={values.tagline} max={IDENTITY_LIMITS.tagline} hint={IDENTITY_LIMITS.taglineHint} />}
                        />
                    </LabeledField>

                    <LabeledField label="Short description" required help={HELP.shortDescription}>
                        <TextField
                            value={values.shortDescription} fullWidth size="small" hiddenLabel multiline minRows={2}
                            placeholder="Real-time Forex and Gold trading signals with configurable risk and execution preferences."
                            onChange={(e) => set("shortDescription", e.target.value.slice(0, IDENTITY_LIMITS.shortDescription))}
                            onBlur={() => markTouched("shortDescription")}
                            error={!!errorFor("shortDescription")}
                            helperText={<CountedHelper error={errorFor("shortDescription")} value={values.shortDescription} max={IDENTITY_LIMITS.shortDescription} />}
                        />
                    </LabeledField>
                </Stack>
            </Box>

            <Divider />

            {/* ── Branding ─────────────────────────────────────────────────── */}
            <Box>
                <Typography variant="subtitle1" fontWeight={900}>Branding</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Optional, but a logo and cover image make your Marketplace listing far more
                    convincing. The logo is a compact identity mark; the cover is a large banner.
                </Typography>

                <Stack direction={{ xs: "column", md: "row" }} spacing={3} alignItems="stretch">
                    <ProductImageField
                        productId={productId} kind="logo" label="Logo"
                        url={values.logoUrl} onChange={(u) => set("logoUrl", u)}
                    />
                    <ProductImageField
                        productId={productId} kind="cover" label="Cover image"
                        url={values.coverImageUrl} onChange={(u) => set("coverImageUrl", u)}
                    />
                </Stack>
            </Box>

            <Typography variant="caption" color="text.secondary">
                <Box component="span" sx={{ color: "error.main" }}>*</Box> Required to complete this step
            </Typography>
        </Stack>
    );
}
