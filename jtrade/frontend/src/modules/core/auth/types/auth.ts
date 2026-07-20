// src/modules/auth/types/auth.ts

export type UserRole = "admin" | "client"; // lo normalizaremos a minúsculas en el hook

// Alineado con UserResponseDto del backend
export interface AuthUser {
    id: string;

    firstName: string;
    middleName?: string;
    lastName: string;
    secondLastName?: string;

    email: string;
    role: UserRole | string; // por si viene "ADMIN"/"CLIENT"
    isActive: boolean;
    avatarUrl?: string;

    createdAt?: string | Date;
    updatedAt?: string | Date;

    [k: string]: any;
}

export interface LoginDto {
    email: string;
    password: string;
}

export interface RegisterDto {
    firstName: string;
    middleName?: string;
    lastName: string;
    secondLastName?: string;
    email: string;
    password: string;
}

export interface ChangePasswordDto {
    current: string;
    next: string;
}

export interface ForgotPasswordDto {
    email: string;
}

export interface ResetPasswordDto {
    token: string;
    newPassword: string;
}

export interface RefreshTokenDto {
    refreshToken: string;
}

export interface CreateUserAdminDto {
    firstName: string;
    middleName?: string;
    lastName: string;
    secondLastName?: string;
    email: string;
    isActive?: boolean;
    avatarUrl?: string;
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