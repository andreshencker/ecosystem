/**
 * Storage seguro (JSON safe)
 * Todos los valores se guardan en localStorage como JSON.
 *
 * ✅ Incluye un evento "auth:token" para que la app se entere cuando cambian
 *    token/refresh/logout y React Query pueda re-fetch automáticamente.
 */

// =========================
// Claves base de AUTH
// =========================
const AUTH_TOKEN = "auth:token";
const AUTH_REFRESH = "auth:refreshToken";
const AUTH_USER = "auth:user";
const AUTH_EXPIRES_AT = "auth:expiresAt"; // timestamp en ms

/**
 * Preferencias de UI, por ejemplo theme. Al hacer logout
 * automático las limpiamos para que el ThemeProvider
 * vuelva a su modo por defecto (dark).
 */
const UI_PREFERENCES = "app:uiPreferences";

// -----------------------------------------------------
// Evento interno para sincronizar auth (token changes)
// -----------------------------------------------------

function emitAuthTokenChanged() {
    try {
        window.dispatchEvent(new Event("auth:token"));
    } catch {
        // ignore
    }
}

// -----------------------------------------------------
// Helpers genéricos JSON safe
// -----------------------------------------------------

export function getItem<T = unknown>(key: string): T | null {
    try {
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as T;
    } catch {
        return null;
    }
}

export function setItem<T = unknown>(key: string, value: T): void {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // ignore
    }
}

export function removeItem(key: string): void {
    try {
        localStorage.removeItem(key);
    } catch {
        // ignore
    }
}

export const storage = { get: getItem, set: setItem, remove: removeItem };

// -----------------------------------------------------
// Tokens
// -----------------------------------------------------

export function getToken(): string | null {
    return localStorage.getItem(AUTH_TOKEN);
}

export function setToken(token: string): void {
    localStorage.setItem(AUTH_TOKEN, token);
    emitAuthTokenChanged(); // ✅ importante
}

export function clearToken(): void {
    localStorage.removeItem(AUTH_TOKEN);
    emitAuthTokenChanged(); // ✅ importante
}

// Refresh Token
export function getRefreshToken(): string | null {
    return localStorage.getItem(AUTH_REFRESH);
}

export function setRefreshToken(token: string | null): void {
    if (token) localStorage.setItem(AUTH_REFRESH, token);
    else localStorage.removeItem(AUTH_REFRESH);

    emitAuthTokenChanged(); // ✅ importante
}

export function clearRefreshToken(): void {
    localStorage.removeItem(AUTH_REFRESH);
    emitAuthTokenChanged(); // ✅ importante
}

/**
 * Expiración del access token (timestamp en ms).
 * La usaremos para logout automático.
 */
export function getTokenExpiresAt(): number | null {
    const v = getItem<number>(AUTH_EXPIRES_AT);
    return typeof v === "number" ? v : null;
}

export function setTokenExpiresAt(timestamp: number | null): void {
    if (timestamp == null) {
        removeItem(AUTH_EXPIRES_AT);
    } else {
        setItem(AUTH_EXPIRES_AT, timestamp);
    }
}

export function clearTokenExpiresAt(): void {
    removeItem(AUTH_EXPIRES_AT);
}

// -----------------------------------------------------
// Usuario
// -----------------------------------------------------

export type StoredUser =
    | {
    _id?: string;
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    flow?: "client" | "provider" | "internal";
    applicationRole?: string;
    organizationId?: string;
    accessTier?: "trial" | "free" | "paid";
    avatarUrl?: string;
}
    | null;

export function getUser<T extends StoredUser = StoredUser>(): T {
    return getItem<T>(AUTH_USER) as T;
}

export function setUser(user: StoredUser): void {
    setItem(AUTH_USER, user);
}

export function clearUser(): void {
    removeItem(AUTH_USER);
}

// Save full session (token, user y expiración opcional)
export function saveSession(params: {
    token: string;
    user: StoredUser;
    refreshToken?: string | null;
    expiresAt?: number | null; // timestamp en ms
}): void {
    const { token, user, refreshToken, expiresAt } = params;

    // ✅ setToken ya emite el evento
    setToken(token);
    setUser(user);

    if (typeof refreshToken !== "undefined") {
        setRefreshToken(refreshToken ?? null); // ✅ emite evento también
    }

    if (typeof expiresAt !== "undefined") {
        setTokenExpiresAt(expiresAt ?? null);
    }

    // ✅ defensivo: por si el token ya existía y quieres forzar sync
    emitAuthTokenChanged();
}

export function loadSession() {
    return {
        token: getToken(),
        user: getUser(),
        refreshToken: getRefreshToken(),
        expiresAt: getTokenExpiresAt(),
    };
}

export function clearSession(): void {
    clearToken(); // ✅ emite evento
    clearRefreshToken(); // ✅ emite evento
    clearTokenExpiresAt();
    clearUser();
    clearUiPreferences();

    // ✅ defensivo: asegura que toda la app se entere
    emitAuthTokenChanged();
}

// -----------------------------------------------------
// Preferencias de UI (ej: theme)
// -----------------------------------------------------

export function getUiPreferences<T = Record<string, any>>(): T {
    return getItem<T>(UI_PREFERENCES) ?? ({} as T);
}

export function setUiPreferences(prefs: Record<string, any>): void {
    setItem(UI_PREFERENCES, prefs);
}

export function clearUiPreferences(): void {
    removeItem(UI_PREFERENCES);

    // Por si tienes alguna otra clave para el tema
    // (esto es “defensivo”, no rompe nada si no existen)
    try {
        localStorage.removeItem("theme");
        localStorage.removeItem("color-mode");
        localStorage.removeItem("mui-mode");
    } catch {
        // ignore
    }
}
