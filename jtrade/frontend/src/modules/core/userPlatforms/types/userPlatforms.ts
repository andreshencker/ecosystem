// src/modules/user-platforms/types/userPlatforms.ts
import type { ConnectionType, PlatformCategory } from "@/modules/core/platforms/types/platforms";

export type UserPlatformStatus = "Pending" | "Connected" | "Error" | string;

export type UserPlatformPlatform = {
    id: string;
    name: string;
    category: PlatformCategory;
    connectionType: ConnectionType;
    imageUrl?: string;
    isActive: boolean;
    isSupported: boolean;
};

export type UserPlatform = {
    id: string;
    userId: string;
    platformId: string;

    status: UserPlatformStatus;
    isActive: boolean;
    isDefault: boolean;

    platform?: UserPlatformPlatform;

    createdAt?: string;
    updatedAt?: string;
};

// ======================
// Payloads / Query Params
// ======================
export type ListAllUserPlatformsParams = {
    userId?: string;
    platformId?: string;
    status?: UserPlatformStatus;
    isDefault?: boolean;
    isActive?: boolean;
};

export type CreateMyUserPlatformPayload = {
    platformId: string;
    isDefault?: boolean;
};

export type UpdateMyUserPlatformPayload = {
    isActive?: boolean;
    // backend lo bloquea aquí; se deja para TS si lo usas en otro lado
    isDefault?: boolean;
};

export type ChangeMyUserPlatformStatusPayload = {
    status: UserPlatformStatus;
};

export type AdminCreateUserPlatformPayload = {
    userId: string;
    platformId: string;
    isDefault?: boolean;
    isActive?: boolean;
    status?: UserPlatformStatus;
};

export type AdminUpdateUserPlatformPayload = {
    isActive?: boolean;
    isDefault?: boolean;
    status?: UserPlatformStatus;
};