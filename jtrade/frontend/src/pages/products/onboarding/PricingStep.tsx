import * as React from "react";
import { Alert, Stack, Typography } from "@mui/material";

import ProductPricingPanel from "@/components/domain/products/ProductPricingPanel";
import type { CommercialReadiness } from "@/types/products";

/**
 * Steps 4 (Pricing) and 5 (Promotions) both operate on ProductPricing options
 * via the existing ProductPricingPanel + its endpoints — nothing is duplicated
 * into Product. The variant only changes the framing copy.
 */
export default function PricingStep({
    productId,
    variant,
    readiness,
}: {
    productId: string;
    variant: "pricing" | "promotions";
    readiness: CommercialReadiness;
}) {
    const pricing = readiness.steps.pricing;
    const promotions = readiness.steps.promotions;

    if (variant === "promotions") {
        return (
            <Stack spacing={2} sx={{ maxWidth: 720 }}>
                <Typography variant="body2" color="text.secondary">
                    Optional. Add a promotion to any pricing option below, or continue without one.
                    Promotions attach to a specific pricing option (percentage off, fixed discount, or
                    a promotional price) with an optional start/end window.
                </Typography>
                {(promotions.configured ?? 0) > 0 ? (
                    <Alert severity="success" variant="outlined">
                        {promotions.configured} promotion{(promotions.configured ?? 0) > 1 ? "s" : ""} configured.
                    </Alert>
                ) : (
                    <Alert severity="info" variant="outlined">
                        No promotion configured — that is fine, this step is optional.
                    </Alert>
                )}
                <ProductPricingPanel productId={productId} />
            </Stack>
        );
    }

    return (
        <Stack spacing={2} sx={{ maxWidth: 720 }}>
            <Typography variant="body2" color="text.secondary">
                Create at least one active pricing option and mark one as the default. Free is a
                one-time option with a price of $0.
            </Typography>
            {pricing.complete ? (
                <Alert severity="success" variant="outlined">Pricing looks good.</Alert>
            ) : (
                <Alert severity="warning" variant="outlined">
                    Still needed: {pricing.missing.join(", ")}.
                </Alert>
            )}
            <ProductPricingPanel productId={productId} />
        </Stack>
    );
}
