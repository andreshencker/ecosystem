// src/types/products.ts
export type ProductRef = { id?: string; _id?: string; name: string };

export type ProductPlatform = {
    platformId?: ProductRef;
    deliveryMode: string;
    runtimeMode: string;
    status: string;
    notes: string;
    currentVersionId: string | null;
    currentVersion: string | null;
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

export type CreateProductPayload = {
    typeProductId: string;
    key: string;
    name: string;
    description?: string;
    platforms?: Array<{ platformId: string }>;
};

export type UpdateProductPayload = Partial<CreateProductPayload> & {
    status?: Product["status"];
};

export const refId = (entry?: ProductRef) => String(entry?.id ?? entry?._id ?? "");
