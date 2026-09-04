import * as React from "react";
import { Box, LinearProgress, Stack, Typography } from "@mui/material";
import CheckRoundedIcon from "@mui/icons-material/CheckRounded";
import RadioButtonUncheckedRoundedIcon from "@mui/icons-material/RadioButtonUncheckedRounded";
import RadioButtonCheckedRoundedIcon from "@mui/icons-material/RadioButtonCheckedRounded";

import type { CommercialReadiness, CommercialStepKey } from "@/types/products";

/** "productType" is Step 1 — a prerequisite, not a commercial-readiness key. */
export type WizardStepKey = "productType" | CommercialStepKey;

/**
 * Steps with no backing implementation yet. They carry no readiness/data —
 * they render a neutral "Not implemented yet" placeholder (in the content
 * panel only — see §12 of the spec, never in the sidebar) and never affect
 * commercial-readiness.ts, Product.onboarding, or any completion signal.
 */
export type PlaceholderStepKey =
    | "support"
    | "versionIdentity"
    | "productContract"
    | "providerConfiguration"
    | "experienceBuilder"
    | "experiencePreview"
    | "implementation"
    | "payloadPreview";

/**
 * Purely visual grouping for the sidebar — NOT steps. No number, no
 * completion icon, not clickable, never counted in "Step X of Y" or in
 * commercial readiness. See getOnboardingSteps() for how a step's `section`
 * is assigned.
 */
export type OnboardingSectionId = "productCommercial" | "signalProduct" | "productVersion" | "reviewPublish";

export const SECTION_LABELS: Record<OnboardingSectionId, string> = {
    productCommercial: "Product Commercial",
    signalProduct: "Signal Product",
    productVersion: "Product Version",
    reviewPublish: "Review & Publish",
};

export type OnboardingStepDef = {
    key: WizardStepKey | PlaceholderStepKey;
    step: number;
    title: string;
    question: string;
    section: OnboardingSectionId;
    /** True = no readiness/data backing yet — renders as a neutral placeholder. */
    placeholder?: boolean;
};

/** { key, title, question } for every Product Version placeholder, in the fixed future order. */
const PRODUCT_VERSION_STEPS: { key: PlaceholderStepKey; title: string; question: string }[] = [
    {
        key: "versionIdentity", title: "Version Identity",
        question: "Define the identity of this product version.",
    },
    {
        key: "productContract", title: "Product Contract",
        question: "Define the technical data structure required by this product version.",
    },
    {
        key: "providerConfiguration", title: "Provider Configuration",
        question: "Configure the technical values provided by the product provider.",
    },
    {
        key: "experienceBuilder", title: "Experience Builder",
        question: "Build the client-facing configuration experience from the Product Contract.",
    },
    {
        key: "experiencePreview", title: "Experience Preview",
        question: "Preview the configuration experience your customers will see.",
    },
    {
        key: "implementation", title: "Implementation",
        question: "Upload and manage the technical implementation for each platform supported by this product version.",
    },
    {
        key: "payloadPreview", title: "Payload Preview",
        question: "Preview the final payload generated from all configured data sources.",
    },
];

/**
 * The wizard's step list, derived from the product type — NOT a fixed
 * constant.
 *
 * Build everything first, review everything at the end: Product Commercial
 * (incl. the Support placeholder) → Signal Product (Signal only) → Product
 * Version placeholders → a single, final Review & Publish.
 *
 * Review & Publish reuses the existing `review` key (and therefore the
 * existing commercial-readiness.ts / ReviewStep behaviour) — only its title,
 * section and VISUAL position changed. Its underlying backend commercial
 * step number is untouched (still 8 for non-Signal / 9 for Signal, computed
 * by commercial-readiness.ts) — the page maps between that backend number
 * and this step's new visual number; see ProductOnboardingPage.
 *
 *   Bot / other types (16 steps): the 7 common steps, Support, the 7 Product
 *     Version placeholders, then Review & Publish.
 *   Signal (17 steps): ...same 7..., Support, Alert Setup, the 7 Product
 *     Version placeholders, then Review & Publish.
 */
export function getOnboardingSteps(isSignal: boolean): OnboardingStepDef[] {
    const steps: OnboardingStepDef[] = [
        { key: "productType", step: 1, title: "Product Type", question: "What kind of product are you creating?", section: "productCommercial" },
        { key: "identity", step: 2, title: "Identity", question: "What product are you creating?", section: "productCommercial" },
        { key: "presentation", step: 3, title: "Presentation", question: "What should customers know about your product?", section: "productCommercial" },
        { key: "platforms", step: 4, title: "Platforms", question: "Which platforms does this product run on?", section: "productCommercial" },
        { key: "classification", step: 5, title: "Classification", question: "How should customers find this product?", section: "productCommercial" },
        { key: "pricing", step: 6, title: "Pricing", question: "How do you want to sell it?", section: "productCommercial" },
        { key: "promotions", step: 7, title: "Promotions", question: "Do you want to offer a promotion?", section: "productCommercial" },
        {
            key: "support", step: 8, title: "Support",
            question: "Define how customers can receive support for this product.",
            section: "productCommercial", placeholder: true,
        },
    ];
    if (isSignal) {
        steps.push({
            key: "alertSetup",
            step: steps.length + 1,
            title: "Alert Setup",
            question: "How will this product generate and expose alerts?",
            section: "signalProduct",
        });
    }
    for (const v of PRODUCT_VERSION_STEPS) {
        steps.push({ ...v, step: steps.length + 1, section: "productVersion", placeholder: true });
    }
    // Review & Publish — the single, final closeout. Reuses the "review" key.
    steps.push({
        key: "review", step: steps.length + 1, title: "Review & Publish",
        question: "Is your product commercially ready?", section: "reviewPublish",
    });
    return steps;
}

export function getTotalSteps(isSignal: boolean): number {
    return getOnboardingSteps(isSignal).length;
}

type Props = {
    steps: OnboardingStepDef[];
    current: number;
    visited: number[];
    readiness: CommercialReadiness;
    /** Step 1 completion — a chosen type (new) or the persisted immutable type (existing). */
    productTypeComplete: boolean;
    onStepClick: (step: number) => void;
};

export default function OnboardingStepper({ steps, current, visited, readiness, productTypeComplete, onStepClick }: Props) {
    const totalSteps = steps.length;
    // Navigation progress (where you are) — separate from commercial readiness (data completion).
    const navPct = Math.round((current / totalSteps) * 100);

    return (
        <Box>
            <Stack direction="row" alignItems="baseline" justifyContent="space-between" sx={{ mb: 0.75 }}>
                <Typography variant="subtitle2" fontWeight={800}>
                    Step {current} of {totalSteps}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                    {navPct}%
                </Typography>
            </Stack>
            <LinearProgress variant="determinate" value={navPct} sx={{ height: 6, borderRadius: 3, mb: 0.75 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                Commercial readiness: {readiness.percentage}%
            </Typography>

            <Stack spacing={0.25}>
                {steps.map((stepDef, index) => {
                    const { key, step, title, section, placeholder } = stepDef;
                    const prevSection = index > 0 ? steps[index - 1].section : null;

                    const s = key === "productType"
                        ? { complete: productTypeComplete, optional: false, missing: [] as string[], configured: 0 }
                        : placeholder
                            ? { complete: false, optional: true, missing: [] as string[], configured: 0 }
                            : readiness.steps[key as CommercialStepKey];

                    const isCurrent = step === current;
                    const isVisited = visited.includes(step);
                    const clickable = isVisited || step <= Math.max(current, ...visited, 1);

                    let Icon = RadioButtonUncheckedRoundedIcon;
                    let color: "success.main" | "primary.main" | "text.disabled" = "text.disabled";
                    if (s.complete) {
                        Icon = CheckRoundedIcon;
                        color = "success.main";
                    } else if (isCurrent) {
                        Icon = RadioButtonCheckedRoundedIcon;
                        color = "primary.main";
                    }

                    return (
                        <React.Fragment key={key}>
                            {/* Section label — purely visual: no number, no icon, not
                                clickable, never counted in Step X of Y or readiness. */}
                            {section !== prevSection && (
                                <Typography
                                    variant="caption"
                                    sx={{
                                        display: "block",
                                        mt: index === 0 ? 0 : 1.25,
                                        mb: 0.5,
                                        px: 1,
                                        fontWeight: 700,
                                        letterSpacing: "0.06em",
                                        textTransform: "uppercase",
                                        color: "text.disabled",
                                    }}
                                >
                                    {SECTION_LABELS[section]}
                                </Typography>
                            )}
                            <Stack
                                direction="row"
                                spacing={1}
                                alignItems="center"
                                onClick={clickable ? () => onStepClick(step) : undefined}
                                sx={{
                                    px: 1,
                                    py: 0.75,
                                    borderRadius: 1.5,
                                    cursor: clickable ? "pointer" : "default",
                                    bgcolor: isCurrent ? "action.selected" : "transparent",
                                    "&:hover": clickable ? { bgcolor: "action.hover" } : undefined,
                                }}
                            >
                                <Icon sx={{ fontSize: 18, color }} />
                                <Typography
                                    variant="body2"
                                    fontWeight={isCurrent ? 800 : 600}
                                    color={s.complete || isCurrent ? "text.primary" : "text.secondary"}
                                    sx={{ flexGrow: 1 }}
                                >
                                    {step}. {title}
                                </Typography>
                                {/* Placeholder steps show no status at all in the sidebar —
                                    "Not implemented yet" only ever appears in the content panel. */}
                                {!placeholder && (
                                    <>
                                        {s.optional && !s.complete && (
                                            <Typography variant="caption" color="text.disabled">Optional</Typography>
                                        )}
                                        {s.optional && s.complete && (s.configured ?? 0) > 0 && (
                                            <Typography variant="caption" color="text.secondary">{s.configured} set</Typography>
                                        )}
                                        {!s.optional && !s.complete && !isCurrent && s.missing.length > 0 && (
                                            <Typography variant="caption" color="warning.main">{s.missing.length} left</Typography>
                                        )}
                                    </>
                                )}
                            </Stack>
                        </React.Fragment>
                    );
                })}
            </Stack>
        </Box>
    );
}
