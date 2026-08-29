// src/types/products.ts
export type ProductRef = { id?: string; _id?: string; name: string };

export type ProductPlatformDiscount = {
    type: "percentage" | "fixed";
    value: number;
    startsAt: string | null;
    endsAt: string | null;
    isActive: boolean;
};

export type ProductPlatform = {
    platformId?: ProductRef;
    deliveryMode: string;
    runtimeMode: string;
    status: string;
    notes: string;
    currentVersionId: string | null;
    currentVersion: string | null;
    billingType: "one_time" | "subscription";
    billingInterval: "month" | "year" | null;
    /** Minor units (cents) — never a float. */
    priceAmount: number;
    currency: string;
    discount: ProductPlatformDiscount | null;
};

export type Product = {
    id?: string;
    _id: string;
    key: string;
    name: string;
    description: string;
    status: "draft" | "pending_review" | "published" | "suspended" | "archived";
    typeProductId?: ProductRef;
    platforms: ProductPlatform[];
    createdAt?: string;
    updatedAt?: string;
};

export type CreateProductPlatformPayload = {
    platformId: string;
    billingType?: "one_time" | "subscription";
    billingInterval?: "month" | "year";
    priceAmount?: number;
    currency?: string;
    discount?: ProductPlatformDiscount | null;
};

export type CreateProductPayload = {
    typeProductId: string;
    key: string;
    name: string;
    description?: string;
    platforms?: CreateProductPlatformPayload[];
};

export type UpdateProductPayload = Partial<CreateProductPayload> & {
    status?: Product["status"];
};

export const refId = (entry?: ProductRef) => String(entry?.id ?? entry?._id ?? "");

/** cents -> "$49.99" (currency is always USD today, but the symbol lookup keeps this honest if that changes). */
export function formatPrice(cents: number, currency: string = "USD"): string {
    const amount = (Number.isFinite(cents) ? cents / 100 : 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    const symbol = currency === "USD" ? "$" : `${currency} `;
    return `${symbol}${amount}`;
}

/** Applies an active, currently-in-window discount to a platform's base price. Returns the base price unchanged otherwise. */
export function getEffectivePriceAmount(platform: Pick<ProductPlatform, "priceAmount" | "discount">, now: Date = new Date()): number {
    const { priceAmount, discount } = platform;
    if (!discount || !discount.isActive) return priceAmount;
    if (discount.startsAt && now < new Date(discount.startsAt)) return priceAmount;
    if (discount.endsAt && now > new Date(discount.endsAt)) return priceAmount;

    if (discount.type === "percentage") {
        const reduced = priceAmount - Math.round((priceAmount * discount.value) / 100);
        return Math.max(0, reduced);
    }
    return Math.max(0, priceAmount - discount.value);
}

export function isDiscountActiveNow(discount: ProductPlatformDiscount | null | undefined, now: Date = new Date()): boolean {
    if (!discount || !discount.isActive) return false;
    if (discount.startsAt && now < new Date(discount.startsAt)) return false;
    if (discount.endsAt && now > new Date(discount.endsAt)) return false;
    return true;
}
