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

import { clearAuthHeader, setAuthHeader } from "@/lib/http";
import type { StoredUser } from "@/lib/storage";
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
} from "@/lib/storage";

import type { AuthUser } from "../types/auth";
import { routeRoleForUser } from "@/app/routing/resolve/resolveAccessFlow";
import {
    logoutWithRefreshToken,
    me as meApi,
    refreshTokensApi,
} from "../api/auth";

/** ===== Tipos expuestos por el contexto ===== */
type User = StoredUser;

type AuthContextValue = {
    user: User;
    token: string | null;
    isAuthenticated: boolean;

    loading: boolean;
    ready: boolean;

    logout: () => Promise<void>;

    refreshMe: () => Promise<void>;
    refreshTokens: () => Promise<void>;

    setUser: (u: User) => void;
    setToken: (t: string | null) => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/** Grapifly's flow is canonical; role remains a UI compatibility alias. */
function normalizeUser(u: AuthUser | StoredUser | null): StoredUser {
    if (!u) return null;
    const anyU = u as any;
    const normalized = {
        ...anyU,
        flow: typeof anyU.flow === "string" ? anyU.flow.toLowerCase().trim() : anyU.flow,
        role: typeof anyU.role === "string" ? anyU.role.toLowerCase().trim() : anyU.role,
    } as StoredUser;
    return { ...normalized, role: routeRoleForUser(normalized) ?? normalized?.role };
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
    const logout = useCallback(async () => {
        setLoading(true);
        try {
            const rt = getRefreshToken();
            if (rt) {
                await logoutWithRefreshToken({ refreshToken: rt }).catch(() => {});
            }
            clearSession();
            toast.success("Signed out");
            const grapiflyUrl = import.meta.env.VITE_GRAPIFLY_ID_URL ?? "http://localhost:3101";
            window.location.replace(
                `${grapiflyUrl.replace(/\/$/, "")}/auth/logout/application/jtrade`,
            );
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
