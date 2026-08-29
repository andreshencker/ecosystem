// src/types/platforms.ts
export type Platform = {
    id: string;
    key: string;
    name: string;
    description: string;
    websiteUrl: string;
    logoUrl: string;
    isActive: boolean;
    displayOrder: number;
};

export type ListPlatformsParams = {
    active?: boolean;
};

export type CreatePlatformPayload = {
    key: string;
    name: string;
    description?: string;
    websiteUrl: string;
    logoUrl?: string;
    isActive?: boolean;
    displayOrder?: number;
};

export type UpdatePlatformPayload = Partial<CreatePlatformPayload>;
