/**
 * Commercial classification vocabulary for Product Onboarding (Step 3).
 * `category` is a plain string on Product for now — a real Category catalogue is
 * deferred. These are suggestions; the field accepts any of them.
 */
export const PRODUCT_CATEGORIES: { value: string; label: string }[] = [
    { value: "trend-following", label: "Trend following" },
    { value: "scalping", label: "Scalping" },
    { value: "swing", label: "Swing trading" },
    { value: "grid", label: "Grid / martingale" },
    { value: "breakout", label: "Breakout" },
    { value: "mean-reversion", label: "Mean reversion" },
    { value: "news", label: "News / event driven" },
    { value: "arbitrage", label: "Arbitrage" },
    { value: "copy-trading", label: "Copy trading" },
    { value: "portfolio", label: "Portfolio / allocation" },
    { value: "indicator", label: "Indicator / tooling" },
    { value: "other", label: "Other" },
];

export const categoryLabel = (value?: string | null): string =>
    PRODUCT_CATEGORIES.find((c) => c.value === value)?.label ?? (value ? value : "");
