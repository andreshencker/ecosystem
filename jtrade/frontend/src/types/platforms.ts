// src/types/platforms.ts
export type Platform = {
    id: string;
    key: string;
    name: string;
    description: string;
    logoUrl: string;
    isActive: boolean;
    isSupported: boolean;
};

export type ListPlatformsParams = {
    active?: boolean;
};

export type CreatePlatformPayload = {
    key: string;
    name: string;
    description?: string;
    logoUrl?: string;
    isActive?: boolean;
    isSupported?: boolean;
};

export type UpdatePlatformPayload = Partial<CreatePlatformPayload>;
