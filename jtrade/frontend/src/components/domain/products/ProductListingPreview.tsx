import * as React from "react";
import { Box, Chip, Divider, Stack, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";

import type { Product, ProductPricing } from "@/types/products";
import { formatPrice } from "@/types/products";
import { categoryLabel } from "@/constants/productClassification";

/**
 * An approximate preview of how the product could look as a Marketplace listing.
 * It is NOT the final Marketplace page — it exists so the provider can sanity-
 * check the quality of their commercial configuration in the Review step.
 */
export default function ProductListingPreview({
    product,
    pricingOptions,
    typeName,
}: {
    product: Product;
    pricingOptions: ProductPricing[];
    typeName?: string;
}) {
    const pres = product.presentation ?? {};
    const active = pricingOptions.filter((o) => o.status === "active");
    const list = (items?: string[]) => (items ?? []).filter(Boolean);

    const priceSuffix = (o: ProductPricing) =>
        o.pricingType === "recurring"
            ? ` / ${o.intervalCount && o.intervalCount > 1 ? `${o.intervalCount} ` : ""}${o.interval}`
            : "";

    return (
        <Box sx={{ border: 1, borderColor: "divider", borderRadius: 2, overflow: "hidden", bgcolor: "background.paper" }}>
            {/* cover */}
            <Box
                sx={{
                    height: 140,
                    bgcolor: "action.hover",
                    backgroundImage: product.coverImageUrl ? `url(${product.coverImageUrl})` : undefined,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                }}
            />

            <Box sx={{ p: 2.5 }}>
                <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 1 }}>
                    {product.logoUrl && (
                        <Box
                            component="img"
                            src={product.logoUrl}
                            alt=""
                            sx={{ width: 44, height: 44, borderRadius: 1.5, objectFit: "cover", border: 1, borderColor: "divider" }}
                        />
                    )}
                    <Box sx={{ minWidth: 0 }}>
                        <Typography variant="h6" fontWeight={900} noWrap>
                            {product.name || "Untitled product"}
                        </Typography>
                        {product.tagline && (
                            <Typography variant="body2" color="text.secondary" noWrap>
                                {product.tagline}
                            </Typography>
                        )}
                    </Box>
                </Stack>

                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1.5 }}>
                    {typeName && <Chip size="small" variant="outlined" label={typeName} />}
                    {product.category && <Chip size="small" variant="outlined" label={categoryLabel(product.category)} />}
                    {(product.platformIds ?? []).map((p) => (
                        <Chip key={p._id ?? p.id ?? p.name} size="small" color="info" variant="outlined" label={p.name} />
                    ))}
                    {(product.tags ?? []).map((t) => (
                        <Chip key={t} size="small" label={t} />
                    ))}
                </Stack>

                {product.shortDescription && (
                    <Typography variant="body2" sx={{ mb: 2 }}>
                        {product.shortDescription}
                    </Typography>
                )}

                {pres.fullDescription && (
                    <Section title="About">
                        <Body>{pres.fullDescription}</Body>
                    </Section>
                )}
                {pres.whatItDoes && (
                    <Section title="What it does">
                        <Body>{pres.whatItDoes}</Body>
                    </Section>
                )}
                {pres.howItWorks && (
                    <Section title="How it works">
                        <Body>{pres.howItWorks}</Body>
                    </Section>
                )}
                {pres.howToUse && (
                    <Section title="How to use it">
                        <Body>{pres.howToUse}</Body>
                    </Section>
                )}
                {pres.whatYouReceive && (
                    <Section title="What you receive">
                        <Body>{pres.whatYouReceive}</Body>
                    </Section>
                )}

                {list(pres.features).length > 0 && (
                    <Section title="Features">
                        <Stack spacing={0.5}>
                            {list(pres.features).map((f) => (
                                <Stack key={f} direction="row" spacing={1} alignItems="flex-start">
                                    <CheckRoundedIcon sx={{ fontSize: 16, color: "success.main", mt: "2px" }} />
                                    <Typography variant="body2">{f}</Typography>
                                </Stack>
                            ))}
                        </Stack>
                    </Section>
                )}

                {list(pres.requirements).length > 0 && (
                    <Section title="Requirements">
                        <Bullets items={list(pres.requirements)} />
                    </Section>
                )}
                {list(pres.limitations).length > 0 && (
                    <Section title="Important considerations">
                        <Bullets items={list(pres.limitations)} />
                    </Section>
                )}

                <Divider sx={{ my: 2 }} />

                <Typography variant="overline" color="text.secondary">
                    Pricing
                </Typography>
                {active.length === 0 ? (
                    <Typography variant="body2" color="warning.main">
                        No active pricing yet.
                    </Typography>
                ) : (
                    <Stack spacing={0.75} sx={{ mt: 0.5 }}>
                        {active.map((o) => (
                            <Stack key={o._id} direction="row" alignItems="baseline" spacing={1}>
                                <Typography variant="body2" fontWeight={700} sx={{ minWidth: 90 }}>
                                    {o.name}
                                </Typography>
                                {o.hasActivePromotion && (
                                    <Typography variant="body2" sx={{ textDecoration: "line-through" }} color="text.disabled">
                                        {formatPrice(o.amount)}
                                    </Typography>
                                )}
                                <Typography variant="body2" fontWeight={800}>
                                    {formatPrice(o.effectiveAmount)}
                                    {priceSuffix(o)}
                                </Typography>
                                {o.isDefault && <Chip size="small" color="primary" label="Default" />}
                                {o.trialEnabled && (
                                    <Typography variant="caption" color="text.secondary">
                                        {o.trialDays}-day trial
                                    </Typography>
                                )}
                            </Stack>
                        ))}
                    </Stack>
                )}
            </Box>
        </Box>
    );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <Box sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 0.5 }}>
                {title}
            </Typography>
            {children}
        </Box>
    );
}

function Body({ children }: { children: React.ReactNode }) {
    return (
        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
            {children}
        </Typography>
    );
}

function Bullets({ items }: { items: string[] }) {
    return (
        <Stack component="ul" sx={{ pl: 2.5, my: 0 }} spacing={0.25}>
            {items.map((i) => (
                <Typography key={i} component="li" variant="body2" color="text.secondary">
                    {i}
                </Typography>
            ))}
        </Stack>
    );
}
