// src/types/productTypes.ts
export type ProductType = {
    id: string;
    key: string;
    name: string;
    description?: string;
    isActive: boolean;
};

export type CreateProductTypePayload = {
    key: string;
    name: string;
    description?: string;
    isActive?: boolean;
};

export type UpdateProductTypePayload = Partial<CreateProductTypePayload>;
