// src/types/productTypes.ts

/**
 * Canonical TypeProduct.key the frontend is allowed to branch on — mirrors
 * backend's `SIGNALS_TYPE_KEY` (src/core/products/product-type-keys.ts). Only
 * used to decide whether the wizard shows the "Alert Setup" step. Never branch
 * on a type's display `name` or a hardcoded id.
 */
export const SIGNAL_TYPE_KEY = "signals";

export type ProductType = {
    id: string;
    key: string;
    name: string;
    shortDescription: string;
    description: string;
    iconUrl: string;
    isActive: boolean;
    displayOrder: number;
    createdAt?: string;
    updatedAt?: string;
};

export type CreateProductTypePayload = {
    key: string;
    name: string;
    shortDescription?: string;
    description?: string;
    iconUrl?: string;
    isActive?: boolean;
    displayOrder?: number;
};

/** `key` is immutable — not part of the update payload. */
export type UpdateProductTypePayload = {
    name?: string;
    shortDescription?: string;
    description?: string;
    iconUrl?: string;
    isActive?: boolean;
    displayOrder?: number;
};
