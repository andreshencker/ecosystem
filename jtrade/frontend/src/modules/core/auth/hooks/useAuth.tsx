// src/modules/auth/hooks/useAuth.tsx
import React, {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";
import toast from "react-hot-toast";

import { clearAuthHeader, setAuthHeader } from "@/app/lib/http";
import type { StoredUser } from "@/app/lib/storage";
import {
    clearRefreshToken,
    clearToken,
    clearUser,
    getRefreshToken,
    getToken as loadToken,
    getUser as loadUser,
    setRefreshToken,
    setToken as saveToken,
    setUser as saveUser,
} from "@/app/lib/storage";

import type { AuthUser } from "../types/auth";
import {
    login as loginApi,
    logoutWithRefreshToken,
    me as meApi,
    refreshTokensApi,
    register as registerApi,
    type RegisterResponse,
} from "../api/auth";

/** ===== Tipos expuestos por el contexto ===== */
type User = StoredUser;

type AuthContextValue = {
    user: User;
    token: string | null;
    isAuthenticated: boolean;

    loading: boolean;
    ready: boolean;

    login: (email: string, password: string) => Promise<void>;
    register: (payload: Record<string, any>) => Promise<RegisterResponse>;
    logout: () => Promise<void>;

    refreshMe: () => Promise<void>;
    refreshTokens: () => Promise<void>;

    setUser: (u: User) => void;
    setToken: (t: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Normaliza el usuario para que role sea "admin" | "client" en minúsculas */
function normalizeUser(u: AuthUser | StoredUser | null): StoredUser {
    if (!u) return null;
    const anyU = u as any;
    const roleRaw = anyU.role;
    const role = typeof roleRaw === "string" ? roleRaw.toLowerCase() : roleRaw;
    return { ...anyU, role };
}

function errorToMessage(err: any, fallback: string) {
    const msg = err?.response?.data?.message || err?.message || fallback;
    if (typeof msg === "string") return msg;
    if (Array.isArray(msg)) return msg.join(", ");
    return fallback;
}

function isEmailNotVerifiedError(err: any) {
    const status = err?.response?.status;
    const msg = err?.response?.data?.message;
    return (
        status === 403 &&
        (msg === "Email not verified" ||
            String(msg).toLowerCase().includes("not verified"))
    );
}

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUserState] = useState<User>(null);
    const [tokenState, setTokenState] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [ready, setReady] = useState(false);

    const isAuthenticated = !!tokenState;

    // --- helpers de sesión ---
    const applyToken = useCallback((t: string | null) => {
        setTokenState(t);
        setAuthHeader(t);

        if (t) saveToken(t);
        else clearToken();
    }, []);

    const applyUser = useCallback((u: AuthUser | StoredUser | null) => {
        const normalized = normalizeUser(u);
        setUserState(normalized);
        saveUser(normalized);
    }, []);

    const clearSession = useCallback(() => {
        setUserState(null);
        setTokenState(null);

        clearAuthHeader();
        clearUser();
        clearToken();
        clearRefreshToken();
    }, []);

    // --- bootstrap inicial ---
    useEffect(() => {
        let alive = true;

        (async () => {
            try {
                const storedToken = loadToken();
                const storedUser = loadUser<User>();

                if (!alive) return;

                if (storedToken) {
                    applyToken(storedToken);
                    setUserState(storedUser ?? null);

                    try {
                        const me = await meApi();
                        if (!alive) return;
                        applyUser(me);
                    } catch {
                        if (!alive) return;
                        clearSession();
                    }
                } else {
                    clearSession();
                }
            } finally {
                if (!alive) return;
                setReady(true);
            }
        })();

        return () => {
            alive = false;
        };
    }, [applyToken, applyUser, clearSession]);

    // --- acciones ---
    const login = useCallback(
        async (email: string, password: string) => {
            setLoading(true);
            try {
                const data = await loginApi({ email, password });

                const accessToken = data.tokens.accessToken;
                const refreshToken = data.tokens.refreshToken;
                const me = data.user;

                if (!accessToken || !me) {
                    throw new Error("Invalid login response");
                }

                applyToken(accessToken);
                setRefreshToken(refreshToken || null);
                applyUser(me);

                toast.success("Welcome!");
            } catch (e: any) {
                if (isEmailNotVerifiedError(e)) {
                    toast.error(
                        "Email not verified. Please check your inbox or resend the verification email."
                    );
                    throw e;
                }

                toast.error(errorToMessage(e, "Could not sign in"));
                throw e;
            } finally {
                setLoading(false);
                setReady(true);
            }
        },
        [applyToken, applyUser]
    );

    /**
     * ✅ Register estricto (backend): NO crea sesión.
     * Retorna { registered, email } para que la UI redirija a /check-email o similar.
     */
    const register = useCallback(
        async (payload: Record<string, any>) => {
            setLoading(true);
            try {
                const data = await registerApi(payload as any);

                if (!data?.registered) {
                    throw new Error("Register failed");
                }

                toast.success("Account created. Please check your email to verify it.");
                return data;
            } catch (e: any) {
                toast.error(errorToMessage(e, "Could not register"));
                throw e;
            } finally {
                setLoading(false);
                setReady(true);
            }
        },
        []
    );

    const logout = useCallback(async () => {
        setLoading(true);
        try {
            const rt = getRefreshToken();
            if (rt) {
                await logoutWithRefreshToken({ refreshToken: rt }).catch(() => {});
            }
            clearSession();
            toast.success("Signed out");
        } finally {
            setLoading(false);
            setReady(true);
        }
    }, [clearSession]);

    const refreshMe = useCallback(async () => {
        const t = loadToken();
        if (!t) return;

        try {
            const me = await meApi();
            applyUser(me);
        } catch {
            clearSession();
        }
    }, [applyUser, clearSession]);

    const refreshTokens = useCallback(async () => {
        const rt = getRefreshToken();
        if (!rt) return;

        try {
            const data = await refreshTokensApi({ refreshToken: rt });

            const accessToken = data.tokens.accessToken;
            const newRefresh = data.tokens.refreshToken;

            applyToken(accessToken);
            setRefreshToken(newRefresh || null);
            applyUser(data.user);
        } catch {
            clearSession();
        }
    }, [applyToken, applyUser, clearSession]);

    const setUserPublic = useCallback((u: User) => applyUser(u as any), [applyUser]);
    const setTokenPublic = useCallback((t: string | null) => applyToken(t), [applyToken]);

    const value = useMemo<AuthContextValue>(
        () => ({
            user,
            token: tokenState,
            isAuthenticated,

            loading,
            ready,

            login,
            register,
            logout,

            refreshMe,
            refreshTokens,

            setUser: setUserPublic,
            setToken: setTokenPublic,
        }),
        [
            user,
            tokenState,
            isAuthenticated,
            loading,
            ready,
            login,
            register,
            logout,
            refreshMe,
            refreshTokens,
            setUserPublic,
            setTokenPublic,
        ]
    );

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
    return ctx;
}