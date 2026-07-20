// src/modules/platforms/types/platforms.ts
export type PlatformCategory = "exchange" | "broker" | "data" | "custody" | "other";
export type PlatformConnectionType = "apikey" | "oauth" | "none";

export type Platform = {
    id: string; // el mapper del backend debe exponer "id" (no _id)
    name: string;
    category: PlatformCategory;
    connectionType: PlatformConnectionType;
    imageUrl?: string;
    isActive: boolean;
    isSupported: boolean;
};

export type ListPlatformsParams = {
    supported?: boolean;
};

export type CreatePlatformPayload = {
    name: string;
    category: PlatformCategory;
    connectionType: PlatformConnectionType;
    imageUrl?: string;
    isActive?: boolean;
    isSupported?: boolean;
};

export type UpdatePlatformPayload = Partial<CreatePlatformPayload>;