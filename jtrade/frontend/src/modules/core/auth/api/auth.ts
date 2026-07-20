// src/modules/auth/api/auth.ts
import { api } from "@/app/lib/http";
import type {
    AuthResponse,
    AuthTokens,
    AuthUser,
    ChangePasswordDto,
    CreateUserAdminDto,
    ForgotPasswordDto,
    LoginDto,
    RefreshTokenDto,
    RegisterDto,
    ResetPasswordDto,
    VerifyEmailDto,
    ResendVerifyEmailDto,
} from "../types/auth";

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

// POST /auth/login  ✅ devuelve { user, tokens }
export async function login(dto: LoginDto): Promise<AuthResponse> {
    const { data } = await api.post("/auth/login", dto);
    return normalizeAuthResponse(data);
}

// POST /auth/register ✅ flujo estricto: NO devuelve tokens
export type RegisterResponse = { registered: boolean; email: string };
export async function register(dto: RegisterDto): Promise<RegisterResponse> {
    const { data } = await api.post("/auth/register", dto);
    return unwrap<RegisterResponse>(data);
}

// GET /auth/me  ✅ ahora soporta wrapper
export async function me(): Promise<AuthUser> {
    const { data } = await api.get("/auth/me");
    return unwrap<AuthUser>(data);
}

// PATCH /auth/password
export async function changePassword(
    payload: ChangePasswordDto
): Promise<{ changed: boolean }> {
    const { data } = await api.patch("/auth/password", payload);
    return unwrap<{ changed: boolean }>(data);
}

// POST /auth/refresh ✅ devuelve { user, tokens }
export async function refreshTokensApi(
    payload: RefreshTokenDto
): Promise<AuthResponse> {
    const { data } = await api.post("/auth/refresh", payload);
    return normalizeAuthResponse(data);
}

// POST /auth/logout
export async function logoutWithRefreshToken(
    payload: RefreshTokenDto
): Promise<{ loggedOut: boolean }> {
    const { data } = await api.post("/auth/logout", payload);
    return unwrap<{ loggedOut: boolean }>(data);
}

// POST /auth/forgot-password
export async function forgotPasswordApi(
    dto: ForgotPasswordDto
): Promise<{ ok: boolean }> {
    const { data } = await api.post("/auth/forgot-password", dto);
    return unwrap<{ ok: boolean }>(data);
}

// POST /auth/reset-password
export async function resetPasswordApi(
    dto: ResetPasswordDto
): Promise<{ changed: boolean }> {
    const { data } = await api.post("/auth/reset-password", dto);
    return unwrap<{ changed: boolean }>(data);
}

// POST /auth/verify-email
export async function verifyEmailApi(
    dto: VerifyEmailDto
): Promise<{ verified: boolean }> {
    const { data } = await api.post("/auth/verify-email", dto);
    return unwrap<{ verified: boolean }>(data);
}

// POST /auth/verify-email/resend
export async function resendVerifyEmailApi(
    dto: ResendVerifyEmailDto
): Promise<{ ok: boolean }> {
    const { data } = await api.post("/auth/verify-email/resend", dto);
    return unwrap<{ ok: boolean }>(data);
}

export async function createAdmin(
    payload: CreateUserAdminDto
): Promise<AuthUser> {
    const { data } = await api.post("/auth/users", payload);
    return unwrap<AuthUser>(data);
}