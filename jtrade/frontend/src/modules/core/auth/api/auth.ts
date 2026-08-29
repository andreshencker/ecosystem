// src/modules/auth/api/auth.ts
import { api } from "@/lib/http";
import type { AuthResponse, AuthTokens, AuthUser, RefreshTokenDto } from "../types/auth";

/**
 * Unwrap genérico para backend que a veces responde:
 * - user directo
 * - { data: user }
 * - { status: "success", data: user }
 */
function unwrap<T>(raw: any): T {
    if (raw && typeof raw === "object") {
        if ("data" in raw) return (raw as any).data as T;
    }
    return raw as T;
}

/**
 * Normaliza cualquier forma de respuesta del backend a:
 * { user, tokens: { accessToken, refreshToken } }
 * (Solo para endpoints que devuelven tokens: login/refresh)
 */
function normalizeAuthResponse(raw: any): AuthResponse {
    const base = raw?.data ?? raw;

    const user: AuthUser =
        base.user ??
        base.userDto ??
        base.data?.user ??
        base.data?.userDto ??
        null;

    if (!user) {
        throw new Error("Auth response does not contain user");
    }

    const tokensRaw = base.tokens ?? base.data?.tokens ?? {};

    const tokens: AuthTokens = {
        accessToken:
            tokensRaw.accessToken ??
            tokensRaw.access_token ??
            base.accessToken ??
            base.access_token ??
            "",
        refreshToken:
            tokensRaw.refreshToken ??
            tokensRaw.refresh_token ??
            base.refreshToken ??
            base.refresh_token ??
            "",
    };

    if (!tokens.accessToken) {
        throw new Error("Auth response does not contain access token");
    }

    return { user, tokens };
}

// ====== Auth endpoints ======

export async function loginWithGrapifly(code: string): Promise<AuthResponse> {
    const { data } = await api.post("/auth/grapifly", { code });
    return normalizeAuthResponse(data);
}

// GET /auth/me  ✅ ahora soporta wrapper
export async function me(): Promise<AuthUser> {
    const { data } = await api.get("/auth/me");
    return unwrap<AuthUser>(data);
}

// POST /auth/refresh ✅ devuelve { user, tokens }
export async function refreshTokensApi(payload: RefreshTokenDto): Promise<AuthResponse> {
    const { data } = await api.post("/auth/refresh", payload);
    return normalizeAuthResponse(data);
}

// POST /auth/logout
export async function logoutWithRefreshToken(payload: RefreshTokenDto): Promise<{ loggedOut: boolean }> {
    const { data } = await api.post("/auth/logout", payload);
    return unwrap<{ loggedOut: boolean }>(data);
}
