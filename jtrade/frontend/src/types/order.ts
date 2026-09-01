// src/types/order.ts
import type { ProductRef } from "@/types/products";

export type OrderStatus = "active" | "cancelled" | "expired" | "past_due" | "refunded";

export type Order = {
    id?: string;
    _id: string;
    productId: ProductRef | string;
    providerOrganizationId: string;
    clientGrapiflyUserId: string;
    clientOrganizationId: string;
    pricingId: string;
    pricingKey: string;
    pricingName: string;
    baseAmount: number;
    discountAmount: number;
    amountPaid: number;
    currency: string;
    pricingType: "one_time" | "recurring";
    interval: "month" | "year" | null;
    intervalCount: number | null;
    promotionType: "percentage" | "fixed_amount" | "direct_price" | null;
    promotionValue: number | null;
    status: OrderStatus;
    startedAt: string;
    currentPeriodEnd: string | null;
    cancelledAt: string | null;
    isTrial?: boolean;
    trialEndsAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
};
