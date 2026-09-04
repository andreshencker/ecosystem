import * as React from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Avatar, Box, Chip, Divider, Paper, Stack, Typography } from "@mui/material";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import toast from "react-hot-toast";

import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingButton } from "@/components/shared/LoadingButton";
import { QueryError } from "@/components/shared/QueryError";
import { errorToMessage } from "@/lib/utils";

import OnboardingStepper, { getOnboardingSteps } from "@/components/domain/products/OnboardingStepper";
import ProductTypeStep from "./onboarding/ProductTypeStep";
import IdentityStep, { useIdentityForm } from "./onboarding/IdentityStep";
import PresentationStep, { usePresentationForm } from "./onboarding/PresentationStep";
import ClassificationStep, { useClassificationForm } from "./onboarding/ClassificationStep";
import PlatformsStep, { usePlatformsForm } from "./onboarding/PlatformsStep";
import PricingStep from "./onboarding/PricingStep";
import AlertSetupStep, { useAlertSetupForm } from "./onboarding/AlertSetupStep";
import ReviewStep from "./onboarding/ReviewStep";
import OnboardingNotImplementedStep from "./onboarding/OnboardingNotImplementedStep";

import { useCreateProduct, useUpdateProduct } from "@/hooks/api/useProducts";
import { useActiveProductTypes } from "@/hooks/api/useProductTypes";
import {
    useCompleteOnboarding,
    useProductOnboarding,
    useSaveOnboardingProgress,
} from "@/hooks/api/useProductOnboarding";
import type { CommercialReadiness, CommercialStepKey } from "@/types/products";
import { SIGNAL_TYPE_KEY } from "@/types/productTypes";
import type { WizardStepKey, PlaceholderStepKey } from "@/components/domain/products/OnboardingStepper";

const EMPTY_READINESS: CommercialReadiness = {
    ready: false,
    percentage: 0,
    steps: {
        identity: { key: "identity", step: 2, label: "Product identity", optional: false, complete: false, missing: ["name", "key", "short description"] },
        presentation: { key: "presentation", step: 3, label: "Product presentation", optional: false, complete: false, missing: ["full description"] },
        platforms: { key: "platforms", step: 4, label: "Platforms", optional: false, complete: false, missing: ["at least one platform"] },
        classification: { key: "classification", step: 5, label: "Classification", optional: false, complete: false, missing: ["category"] },
        pricing: { key: "pricing", step: 6, label: "Pricing", optional: false, complete: false, missing: ["at least one active pricing option"] },
        promotions: { key: "promotions", step: 7, label: "Promotions", optional: true, complete: true, missing: [] },
        alertSetup: { key: "alertSetup", step: 8, label: "Alert Setup", optional: true, complete: true, missing: [] },
        review: { key: "review", step: 8, label: "Review", optional: false, complete: false, missing: [] },
    },
    missing: [],
};

/**
 * VISUAL wizard step numbers — this page's own scheme, after Support/Product
 * Version/Review & Publish reordered the sidebar. These are NOT the backend
 * commercial-readiness step numbers (which stay exactly as
 * commercial-readiness.ts computes them: identity=2 … promotions=7,
 * alertSetup=8 for Signal, review=8/9 — untouched). The two schemes are
 * bridged by backendStepForVisual()/backendStepToVisual() below, built from
 * `wizardSteps` + `readiness` at render time, never hardcoded beyond this.
 */
const S_TYPE = 1, S_IDENTITY = 2, S_PRESENTATION = 3, S_PLATFORMS = 4, S_CLASSIFICATION = 5, S_PRICING = 6, S_PROMOTIONS = 7, S_ALERT_SETUP = 9;
/** The keys commercial-readiness.ts actually tracks (+ "productType", step 1, tracked separately). */
const COMMERCIAL_KEYS: CommercialStepKey[] = ["identity", "presentation", "platforms", "classification", "pricing", "promotions", "alertSetup", "review"];

export default function ProductOnboardingPage() {
    const { productId: routeProductId } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const productId = routeProductId ?? null;
    const isNew = !productId;

    const onboarding = useProductOnboarding(productId);
    const data = onboarding.data;
    const product = data?.product ?? null;
    const readiness = data?.readiness ?? EMPTY_READINESS;

    const identityForm = useIdentityForm(product);
    const presentationForm = usePresentationForm(product);
    const classificationForm = useClassificationForm(product);
    const platformsForm = usePlatformsForm(product);
    const alertSetupForm = useAlertSetupForm(product);

    const create = useCreateProduct();
    const update = useUpdateProduct();
    const saveProgress = useSaveOnboardingProgress(productId);
    const complete = useCompleteOnboarding(productId);

    const activeTypes = useActiveProductTypes();
    const [selectedTypeId, setSelectedTypeId] = React.useState<string | null>(null);

    const [step, setStep] = React.useState(1);
    const [stepInit, setStepInit] = React.useState(false);

    // Selected/persisted type + its display context (header chip + step 1 read-only card).
    const persistedType = product?.typeProductId as
        | { _id?: string; name?: string; iconUrl?: string; isActive?: boolean; key?: string }
        | null
        | undefined;
    const productTypeComplete = isNew ? !!selectedTypeId : !!persistedType?._id;

    const typeCtx = React.useMemo(() => {
        if (!isNew) {
            return persistedType?.name
                ? { name: persistedType.name, iconUrl: persistedType.iconUrl ?? "", isActive: persistedType.isActive, key: persistedType.key ?? "" }
                : null;
        }
        const t = (activeTypes.data ?? []).find((x) => x.id === selectedTypeId);
        return t ? { name: t.name, iconUrl: t.iconUrl, isActive: true, key: t.key } : null;
    }, [isNew, persistedType, activeTypes.data, selectedTypeId]);

    /** Alert Setup only exists for Signal products — resolved from the real
     * TypeProduct catalogue key (never its display name or a hardcoded id). */
    const isSignal = typeCtx?.key === SIGNAL_TYPE_KEY;
    const wizardSteps = React.useMemo(() => getOnboardingSteps(isSignal), [isSignal]);
    const totalSteps = wizardSteps.length;
    /** Review & Publish is always the final visual step. */
    const S_REVIEW_PUBLISH = totalSteps;

    // ── Visual step <-> backend commercial step mapping ─────────────────────
    // Support / Product Version steps have no backend counterpart at all
    // (backendStepForVisual returns null for them — never persisted). The
    // real commercial steps keep their EXACT backend step numbers; only their
    // VISUAL position changed, so we always persist/read the backend's own
    // number for a given key, never the visual one, and vice versa.
    const visualStepByKey = React.useMemo(() => {
        const map: Partial<Record<WizardStepKey | PlaceholderStepKey, number>> = {};
        for (const s of wizardSteps) map[s.key] = s.step;
        return map;
    }, [wizardSteps]);

    const backendKeyByStep = React.useMemo(() => {
        const map: Partial<Record<number, WizardStepKey>> = { 1: "productType" };
        const keys: CommercialStepKey[] = isSignal
            ? ["identity", "presentation", "platforms", "classification", "pricing", "promotions", "alertSetup", "review"]
            : ["identity", "presentation", "platforms", "classification", "pricing", "promotions", "review"];
        for (const k of keys) map[readiness.steps[k].step] = k;
        return map;
    }, [readiness, isSignal]);

    const backendStepToVisual = React.useCallback(
        (backendStep: number): number => {
            const key = backendKeyByStep[backendStep];
            return (key && visualStepByKey[key]) || backendStep;
        },
        [backendKeyByStep, visualStepByKey],
    );

    /** The backend commercial step number to persist for a given VISUAL step —
     * null for Support / Product Version placeholders (local navigation only). */
    const backendStepForVisual = React.useCallback(
        (visualStep: number): number | null => {
            const key = wizardSteps.find((s) => s.step === visualStep)?.key;
            if (!key) return null;
            if (key === "productType") return 1;
            if ((COMMERCIAL_KEYS as string[]).includes(key)) return readiness.steps[key as CommercialStepKey].step;
            return null;
        },
        [wizardSteps, readiness],
    );

    React.useEffect(() => {
        if (isNew) { setStep(1); setStepInit(true); return; }
        if (data && !stepInit) {
            const q = Number(searchParams.get("step"));
            const target = q >= 1 && q <= totalSteps
                ? q
                : backendStepToVisual(data.progress?.currentStep || data.resumeStep || 1);
            setStep(target);
            setStepInit(true);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, isNew, stepInit]);

    const visited = React.useMemo(() => {
        const backendVisited = data?.progress?.visitedSteps ?? [1];
        const visualVisited = backendVisited.map(backendStepToVisual);
        return [...new Set([...visualVisited, step])].sort((a, b) => a - b);
    }, [data?.progress?.visitedSteps, step, backendStepToVisual]);

    const saving = create.isPending || update.isPending || saveProgress.isPending;

    /** Persist the data of a given step. Returns true when it is safe to advance. */
    const persistStep = async (which: number, opts: { silent?: boolean } = {}): Promise<boolean> => {
        try {
            if (which === S_TYPE) {
                if (isNew && !selectedTypeId) {
                    if (!opts.silent) toast.error("Choose a product type to continue.");
                    return false;
                }
                return true; // nothing to persist; the product is created in Step 2
            }
            if (which === S_IDENTITY) {
                if (!identityForm.valid) {
                    identityForm.showAllErrors();
                    if (!opts.silent) toast.error("Name, key and short description are required.");
                    return false;
                }
                if (isNew) {
                    if (!selectedTypeId) { toast.error("Choose a product type first."); return false; }
                    const created = await create.mutateAsync({ ...identityForm.payload(), typeProductId: selectedTypeId });
                    navigate(`/provider/products/${created._id}/onboarding?step=${S_PRESENTATION}`, { replace: true });
                    return false; // navigation drives the advance
                }
                await update.mutateAsync({ id: productId!, data: identityForm.payload() });
                return true;
            }
            if (which === S_PRESENTATION) {
                if (!presentationForm.valid) {
                    if (!opts.silent) toast.error("Full description, what the client receives, and at least one feature are required.");
                    return false;
                }
                await update.mutateAsync({ id: productId!, data: { presentation: presentationForm.payload() } });
                return true;
            }
            if (which === S_CLASSIFICATION) {
                if (!classificationForm.valid) {
                    if (!opts.silent) toast.error("A category is required.");
                    return false;
                }
                await update.mutateAsync({ id: productId!, data: classificationForm.payload() });
                return true;
            }
            if (which === S_PLATFORMS) {
                if (!platformsForm.valid) {
                    if (!opts.silent) toast.error("Select at least one platform.");
                    return false;
                }
                await update.mutateAsync({ id: productId!, data: platformsForm.payload() });
                return true;
            }
            if (which === S_PRICING) {
                if (!readiness.steps.pricing.complete && !opts.silent) {
                    toast("Pricing is not complete yet — you can come back to it.", { icon: "⚠️" });
                }
                return true; // pricing is saved inline by the panel
            }
            if (isSignal && which === S_ALERT_SETUP) {
                if (!alertSetupForm.valid) {
                    if (!opts.silent) toast.error("Select at least one indicator, and make sure each has an enabled alert.");
                    return false;
                }
                await update.mutateAsync({ id: productId!, data: alertSetupForm.payload() });
                return true;
            }
            return true; // S_PROMOTIONS optional; S_REVIEW handled by ReviewStep
        } catch (err) {
            if (!opts.silent) toast.error(errorToMessage(err, "Could not save this step."));
            return false;
        }
    };

    const goToStep = (next: number) => {
        setStep(next);
        // Support / Product Version placeholders map to no backend step — local
        // navigation only. Real commercial steps (incl. Review & Publish) persist
        // their OWN backend step number, never the visual one.
        const backendStep = backendStepForVisual(next);
        if (productId && backendStep != null) {
            saveProgress.mutate({ currentStep: backendStep, visitedSteps: [backendStep] });
        }
    };

    /** Steps that hold local form state needing an explicit save before navigating away. */
    const needsSilentPersist = (s: number) =>
        (s >= S_IDENTITY && s <= S_PRICING) || (isSignal && s === S_ALERT_SETUP);

    const navigateToStep = async (target: number) => {
        if (target === step) return;
        if (isNew) {
            // No product yet — only Steps 1 & 2 exist, and jumping never creates one.
            if (target <= S_IDENTITY) setStep(target);
            return;
        }
        if (needsSilentPersist(step)) await persistStep(step, { silent: true });
        goToStep(target);
    };

    const handleContinue = async () => {
        if (isNew && step === S_TYPE) {
            if (!selectedTypeId) { toast.error("Choose a product type to continue."); return; }
            setStep(S_IDENTITY);
            return;
        }
        const ok = await persistStep(step);
        if (ok) goToStep(Math.min(step + 1, S_REVIEW_PUBLISH));
    };

    const handleBack = async () => {
        if (step <= 1) return;
        if (isNew) { setStep(step - 1); return; }
        if (needsSilentPersist(step)) await persistStep(step, { silent: true });
        goToStep(step - 1);
    };

    const handleSaveExit = async () => {
        if (!isNew && needsSilentPersist(step)) await persistStep(step, { silent: true });
        navigate("/provider/products");
    };

    // ── render ───────────────────────────────────────────────────────────────

    if (!isNew && onboarding.isLoading) {
        return <Typography color="text.secondary">Loading…</Typography>;
    }
    if (!isNew && onboarding.isError) {
        return (
            <QueryError
                message={(onboarding.error as Error)?.message ?? "Could not load this product."}
                onRetry={() => onboarding.refetch()}
            />
        );
    }

    const stepMeta = wizardSteps.find((s) => s.step === step)!;

    const stepContent = () => {
        if (step === S_TYPE) {
            return (
                <ProductTypeStep
                    isNew={isNew}
                    selectedId={selectedTypeId}
                    onSelect={setSelectedTypeId}
                    currentType={typeCtx}
                />
            );
        }
        if (step === S_IDENTITY) return <IdentityStep form={identityForm} productId={productId} isNew={isNew} />;
        if (step === S_PRESENTATION) return <PresentationStep form={presentationForm} />;
        if (step === S_PLATFORMS) return <PlatformsStep form={platformsForm} />;
        if (step === S_CLASSIFICATION) return <ClassificationStep form={classificationForm} />;
        if (step === S_PRICING && productId) return <PricingStep productId={productId} variant="pricing" readiness={readiness} />;
        if (step === S_PROMOTIONS && productId) return <PricingStep productId={productId} variant="promotions" readiness={readiness} />;
        if (isSignal && step === S_ALERT_SETUP && productId) return <AlertSetupStep form={alertSetupForm} />;
        if (step === S_REVIEW_PUBLISH && data) {
            return (
                <ReviewStep
                    data={data}
                    completing={complete.isPending}
                    onComplete={() => complete.mutate()}
                    onGoToStep={(s) => navigateToStep(s)}
                />
            );
        }
        // Support + every Product Version step are placeholders in this task —
        // same neutral "Not implemented yet" content, nothing persisted.
        if (stepMeta?.placeholder) return <OnboardingNotImplementedStep />;
        return null;
    };

    return (
        <>
            <PageHeader
                title="Create product"
                subtitle="Product onboarding — configure your product step by step."
                breadcrumbs={[{ label: "Products", href: "/provider/products" }, { label: "New product" }]}
                actions={
                    <LoadingButton variant="text" startIcon={<ArrowBackRoundedIcon />} onClick={() => navigate("/provider/products")}>
                        All products
                    </LoadingButton>
                }
            />

            {typeCtx && (
                <Chip
                    avatar={
                        <Avatar src={typeCtx.iconUrl || undefined} sx={{ bgcolor: "action.hover" }}>
                            <CategoryOutlinedIcon sx={{ fontSize: 16, color: "text.disabled" }} />
                        </Avatar>
                    }
                    label={
                        <>
                            <Box component="span" sx={{ color: "text.secondary", mr: 0.5 }}>Creating a</Box>
                            <strong>{typeCtx.name}</strong>
                            {typeCtx.isActive === false && (
                                <Box component="span" sx={{ color: "text.disabled", ml: 0.75 }}>· inactive for new products</Box>
                            )}
                        </>
                    }
                    variant="outlined"
                    sx={{ mb: 2, py: 2, fontWeight: 600 }}
                />
            )}

            <Box sx={{ display: "grid", gap: 3, gridTemplateColumns: { xs: "1fr", md: "300px 1fr" }, alignItems: "start" }}>
                <Paper variant="outlined" sx={{ p: 2, position: { md: "sticky" }, top: { md: 16 } }}>
                    <OnboardingStepper
                        steps={wizardSteps}
                        current={step}
                        visited={visited}
                        readiness={readiness}
                        productTypeComplete={productTypeComplete}
                        onStepClick={(s) => navigateToStep(s)}
                    />
                </Paper>

                <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
                    <Typography variant="overline" color="text.secondary">
                        {stepMeta.title} · Step {step} of {totalSteps}
                    </Typography>
                    <Typography variant="h6" fontWeight={900} sx={{ mb: 2 }}>{stepMeta.question}</Typography>

                    {stepContent()}

                    <Divider sx={{ mt: 3, mb: 2 }} />

                    <Stack direction={{ xs: "column-reverse", sm: "row" }} spacing={1.5} justifyContent="space-between">
                        <LoadingButton variant="outlined" color="inherit" onClick={handleBack} disabled={step <= 1 || saving}>
                            Back
                        </LoadingButton>
                        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
                            {!isNew && (
                                <LoadingButton variant="text" onClick={handleSaveExit} disabled={saving}>
                                    Save draft & exit
                                </LoadingButton>
                            )}
                            {step < S_REVIEW_PUBLISH && (
                                <LoadingButton variant="contained" loading={saving} onClick={handleContinue}>
                                    {step === S_TYPE
                                        ? "Next"
                                        : isNew && step === S_IDENTITY
                                            ? "Create & continue"
                                            // Support / Product Version placeholders: nothing to save.
                                            : backendStepForVisual(step) == null ? "Continue" : "Save & continue"}
                                </LoadingButton>
                            )}
                        </Stack>
                    </Stack>
                </Paper>
            </Box>
        </>
    );
}
