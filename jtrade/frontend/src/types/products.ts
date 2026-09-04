// src/types/products.ts
export type ProductRef = { id?: string; _id?: string; name: string; key?: string };

export type ProductParamType = "number" | "boolean" | "string" | "list";
export type ProductParamRepeat = "once" | "per-symbol";

export type ProductParam = {
    key: string;
    label: string;
    type: ProductParamType;
    defaultValue: unknown;
    required: boolean;
    /** "once" = one value per account. "per-symbol" = one value per alert (symbol + timeframe). */
    repeat: ProductParamRepeat;
    /** Free-text section label — cosmetic. */
    group: string;
    min: number | null;
    max: number | null;
    options: string[];
};

export type ProductFaqEntry = { question: string; answer: string };

/** Commercial content shown before purchase. NOT the future ProductVersion "Product Experience". */
export type ProductPresentation = {
    fullDescription: string;
    whatItDoes: string;
    howItWorks: string;
    howToUse: string;
    whatYouReceive: string;
    features: string[];
    requirements: string[];
    limitations: string[];
    faq: ProductFaqEntry[];
    documentationUrl: string;
    supportUrl: string;
    videoUrl: string;
};

export type ProductOnboardingState = {
    currentStep: number;
    visitedSteps: number[];
    startedAt?: string;
    lastActiveAt?: string;
    completedAt: string | null;
};

export type Product = {
    id?: string;
    _id: string;
    key: string;
    name: string;
    description: string;
    status: "draft" | "pending_review" | "published" | "suspended" | "archived";
    typeProductId?: ProductRef | null;
    platformId?: ProductRef | null;
    /** Commercial: every platform the product operates on (onboarding Step 5). */
    platformIds?: ProductRef[];
    indicatorIds: ProductRef[];
    params: ProductParam[];
    /** First-party product implemented and operated by Grapifly (e.g. the Signal Bot). */
    native?: boolean;
    // ── commercial ──
    tagline?: string;
    shortDescription?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    presentation?: Partial<ProductPresentation>;
    category?: string;
    tags?: string[];
    onboarding?: ProductOnboardingState;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateProductPayload = {
    key: string;
    name: string;
    /** Required — chosen on the type-selection screen before onboarding. */
    typeProductId: string;
    platformId?: string;
    platformIds?: string[];
    description?: string;
    tagline?: string;
    shortDescription?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    indicatorIds?: string[];
};

export type ProductParamInput = {
    key: string;
    label: string;
    type: ProductParamType;
    defaultValue?: unknown;
    required?: boolean;
    repeat?: ProductParamRepeat;
    group?: string;
    min?: number;
    max?: number;
    options?: string[];
};

export type UpdateProductPayload = {
    key?: string;
    name?: string;
    description?: string;
    tagline?: string;
    shortDescription?: string;
    logoUrl?: string;
    coverImageUrl?: string;
    presentation?: Partial<ProductPresentation>;
    category?: string;
    tags?: string[];
    platformIds?: string[];
    indicatorIds?: string[];
    params?: ProductParamInput[];
    status?: Product["status"];
};

// ── Commercial onboarding (product-onboarding module) ────────────────────────

export type CommercialStepKey =
    | "identity"
    | "presentation"
    | "classification"
    | "platforms"
    | "pricing"
    | "promotions"
    | "alertSetup"
    | "review";

export type CommercialStepReadiness = {
    key: CommercialStepKey;
    step: number;
    label: string;
    optional: boolean;
    complete: boolean;
    missing: string[];
    configured?: number;
};

export type CommercialReadiness = {
    ready: boolean;
    percentage: number;
    steps: Record<CommercialStepKey, CommercialStepReadiness>;
    missing: string[];
};

export type ProductOnboardingResponse = {
    product: Product;
    pricingOptions: ProductPricing[];
    progress: ProductOnboardingState;
    readiness: CommercialReadiness;
    resumeStep: number;
};

// ── Pricing (product-pricing module) ─────────────────────────────────────────

export type PricingPromotion = {
    type: "percentage" | "fixed_amount" | "direct_price";
    value: number;
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
};

export type ProductPricing = {
    id?: string;
    _id: string;
    productId: string;
    key: string;
    name: string;
    pricingType: "one_time" | "recurring";
    amount: number;
    currency: "USD";
    interval: "month" | "year" | null;
    intervalCount: number | null;
    trialEnabled: boolean;
    trialDays: number;
    promotion: PricingPromotion | null;
    status: "active" | "inactive";
    isDefault: boolean;
    displayOrder: number;
    hasActivePromotion: boolean;
    discountAmount: number;
    effectiveAmount: number;
    createdAt?: string;
};

export type ProductPricingPayload = {
    key: string;
    name: string;
    pricingType: "one_time" | "recurring";
    amount: number;
    currency?: "USD";
    interval?: "month" | "year" | null;
    intervalCount?: number | null;
    trialEnabled: boolean;
    trialDays: number;
    promotion?: Omit<PricingPromotion, "startsAt" | "endsAt"> & { startsAt?: string | null; endsAt?: string | null } | null;
    status: "active" | "inactive";
    isDefault: boolean;
    displayOrder: number;
};

/** One row of GET /pricing — a product with its current price + active promotion. */
export type PricingOverviewRow = {
    id?: string;
    product: Pick<Product, "_id" | "name" | "key" | "status"> & {
        typeProductId?: ProductRef;
        platformId?: ProductRef;
    };
    options: ProductPricing[];
};

export const refId = (entry?: ProductRef) => String(entry?.id ?? entry?._id ?? "");

/** cents -> "$49.99" */
export function formatPrice(cents: number | null | undefined, currency: string = "USD"): string {
    const amount = (Number.isFinite(cents as number) ? (cents as number) / 100 : 0).toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
    const symbol = currency === "USD" ? "$" : `${currency} `;
    return `${symbol}${amount}`;
}
