import * as React from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Chip, Divider, Stack, Typography } from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import ArrowForwardRoundedIcon from "@mui/icons-material/ArrowForwardRounded";

import { LoadingButton } from "@/components/shared/LoadingButton";
import ProductListingPreview from "@/components/domain/products/ProductListingPreview";
import { getOnboardingSteps } from "@/components/domain/products/OnboardingStepper";
import type { ProductOnboardingResponse } from "@/types/products";
import { SIGNAL_TYPE_KEY } from "@/types/productTypes";

export default function ReviewStep({
    data,
    completing,
    onComplete,
    onGoToStep,
}: {
    data: ProductOnboardingResponse;
    completing: boolean;
    onComplete: () => void;
    onGoToStep: (step: number) => void;
}) {
    const navigate = useNavigate();
    const { readiness, product, pricingOptions } = data;
    const alreadyCompleted = !!product.onboarding?.completedAt;
    const typeName = product.typeProductId?.name;
    const isSignal = product.typeProductId?.key === SIGNAL_TYPE_KEY;
    const steps = getOnboardingSteps(isSignal);

    return (
        <Stack spacing={3} sx={{ maxWidth: 900 }}>
            <Box>
                <Stack direction="row" alignItems="baseline" spacing={1}>
                    <Typography variant="h6" fontWeight={900}>Commercial readiness</Typography>
                    <Typography variant="h6" fontWeight={900} color={readiness.ready ? "success.main" : "warning.main"}>
                        {readiness.percentage}%
                    </Typography>
                </Stack>

                <Stack spacing={0.5} sx={{ mt: 1.5 }}>
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ py: 0.5 }}>
                        <CheckCircleRoundedIcon sx={{ fontSize: 18, color: "success.main" }} />
                        <Typography variant="body2" fontWeight={700} sx={{ flexGrow: 1 }}>Product Type</Typography>
                        <Typography variant="caption" color="text.secondary">{typeName ?? "—"}</Typography>
                    </Stack>
                    {steps.filter((s) => s.key !== "review" && s.key !== "productType" && !s.placeholder).map((s) => {
                        const r = readiness.steps[s.key as keyof typeof readiness.steps];
                        return (
                            <Stack
                                key={s.key}
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                onClick={() => onGoToStep(s.step)}
                                sx={{ cursor: "pointer", py: 0.5, "&:hover": { color: "primary.main" } }}
                            >
                                {r.complete ? (
                                    <CheckCircleRoundedIcon sx={{ fontSize: 18, color: "success.main" }} />
                                ) : (
                                    <RadioButtonUncheckedRoundedIcon sx={{ fontSize: 18, color: r.optional ? "text.disabled" : "warning.main" }} />
                                )}
                                <Typography variant="body2" fontWeight={700} sx={{ flexGrow: 1 }}>
                                    {s.title}
                                </Typography>
                                {r.optional && <Chip size="small" label="Optional" variant="outlined" />}
                                {!r.complete && r.missing.length > 0 && (
                                    <Typography variant="caption" color="warning.main">
                                        {r.missing.join(", ")}
                                    </Typography>
                                )}
                            </Stack>
                        );
                    })}
                </Stack>
            </Box>

            {!readiness.ready ? (
                <Alert severity="warning">
                    Complete the steps above to make this product commercially ready.
                </Alert>
            ) : alreadyCompleted ? (
                <Alert severity="success" icon={<CheckCircleRoundedIcon />}>
                    This product is <strong>commercially ready</strong>. The next step is Product Version
                    onboarding (technical), which is where it becomes marketplace-ready.
                </Alert>
            ) : (
                <Alert severity="info">
                    Everything checks out. Confirm below to mark the product commercially ready.
                </Alert>
            )}

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                <LoadingButton
                    variant="contained"
                    loading={completing}
                    disabled={!readiness.ready || alreadyCompleted}
                    onClick={onComplete}
                    startIcon={<CheckCircleRoundedIcon />}
                >
                    {alreadyCompleted ? "Commercially ready" : "Mark commercially ready"}
                </LoadingButton>
                <LoadingButton
                    variant="outlined"
                    disabled={!readiness.ready}
                    endIcon={<ArrowForwardRoundedIcon />}
                    onClick={() => navigate(`/provider/product-versions?productId=${product._id}`)}
                >
                    Continue to Product Version
                </LoadingButton>
            </Stack>
            <Typography variant="caption" color="text.secondary">
                Product Version onboarding is a separate flow. This button opens the current versions
                page — the new technical wizard is the next phase.
            </Typography>

            <Divider />

            <Box>
                <Typography variant="overline" color="text.secondary">Marketplace listing preview (approximate)</Typography>
                <Box sx={{ mt: 1 }}>
                    <ProductListingPreview product={product} pricingOptions={pricingOptions} typeName={typeName} />
                </Box>
            </Box>
        </Stack>
    );
}
