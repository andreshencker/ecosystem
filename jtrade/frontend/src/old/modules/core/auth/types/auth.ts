// src/modules/auth/types/auth.ts

export type UserRole = "admin" | "client" | "provider";

// Alineado con UserResponseDto del backend
export interface AuthUser {
    id: string;

    firstName: string;
    middleName?: string;
    lastName: string;
    secondLastName?: string;

    email: string;
    role: UserRole | string; // por si viene "ADMIN"/"CLIENT"
    flow: "client" | "provider" | "internal";
    applicationRole: string;
    organizationId: string;
    accessTier?: "trial" | "free" | "paid";
    isActive: boolean;
    avatarUrl?: string;

    createdAt?: string | Date;
    updatedAt?: string | Date;

    [k: string]: any;
}

export interface RefreshTokenDto {
    refreshToken: string;
}

// === Tokens y respuesta de auth ===

export interface AuthTokens {
    accessToken: string;
    refreshToken: string;
}

export interface AuthResponse {
    user: AuthUser;
    tokens: AuthTokens;
}
