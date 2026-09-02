// src/app/context/AppSessionContext.tsx
import React, {
    createContext,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import toast from "react-hot-toast";

import {useAuth} from "@/old/modules/core/auth/hooks/useAuth";
import {clearSession, clearUiPreferences, getTokenExpiresAt} from "@/lib/storage";

/**
 * AppSessionContext
 * - Solo maneja estado de sesión + auto-logout por expiración
 * - y una flag: needsOnboarding (regla simple, se puede mejorar luego)
 *
 * NO maneja plataformas, cuentas, etc.
 */

type AppState = {
    ready: boolean;
    booting: boolean;
    error: string | null;
    needsOnboarding: boolean;
};

const initialState: AppState = {
    ready: false,
    booting: false,
    error: null,
    needsOnboarding: false,
};

type AppSessionContextValue = AppState & {
    refresh: () => Promise<void>;
    reset: () => void;
};

const AppSessionContext = createContext<AppSessionContextValue | undefined>(undefined);

export function AppSessionProvider({ children }: { children: ReactNode }) {
    const { isAuthenticated, user, logout } = useAuth();
    const [state, setState] = useState<AppState>(initialState);

    const bootedOnce = useRef(false);
    const logoutTimerRef = useRef<number | null>(null);

    const setBooting = (b: boolean) => setState((s) => ({ ...s, booting: b }));
    const setReady = (r: boolean) => setState((s) => ({ ...s, ready: r }));
    const setError = (e: string | null) => setState((s) => ({ ...s, error: e }));

    // --------------------------
    // Auto-logout por expiración
    // --------------------------
    const cancelLogoutTimer = useCallback(() => {
        if (logoutTimerRef.current != null) {
            window.clearTimeout(logoutTimerRef.current);
            logoutTimerRef.current = null;
        }
    }, []);

    const handleAutoLogout = useCallback(() => {
        clearSession();
        clearUiPreferences();

        try {
            logout?.();
        } catch {
            // ignore
        }

        toast("Your session has expired. Please sign in again.", { icon: "⏰" });
    }, [logout]);

    const scheduleAutoLogout = useCallback(() => {
        cancelLogoutTimer();

        const expiresAt = getTokenExpiresAt();
        if (!expiresAt) return;

        const remaining = expiresAt - Date.now();

        if (remaining <= 0) {
            handleAutoLogout();
            return;
        }

        logoutTimerRef.current = window.setTimeout(handleAutoLogout, remaining);
    }, [cancelLogoutTimer, handleAutoLogout]);

    // --------------------------
    // Onboarding resolver (simple)
    // --------------------------
    const resolveNeedsOnboarding = useCallback(async () => {
        /**
         * Regla actual (simple):
         * - Si el user trae onboardingCompleted boolean -> needsOnboarding = !onboardingCompleted
         * - Si no existe ese flag, fallback a false (no bloquea el flujo)
         *
         * Luego puedes reemplazar esto por un endpoint real:
         *   GET /onboarding/status -> { needsOnboarding: boolean }
         */
        const flag = (user as any)?.onboardingCompleted;
        if (typeof flag === "boolean") return !flag;

        return false;
    }, [user]);

    // --------------------------
    // Refresh principal
    // --------------------------
    const refresh = useCallback(async () => {
        // No autenticado: listo, sin onboarding
        if (!isAuthenticated) {
            setState({
                ready: true,
                booting: false,
                error: null,
                needsOnboarding: false,
            });
            cancelLogoutTimer();
            return;
        }

        if (!user) return;

        // Si token expiró -> auto logout
        const expiresAt = getTokenExpiresAt();
        if (expiresAt && Date.now() > expiresAt) {
            handleAutoLogout();
            return;
        }

        try {
            setBooting(true);
            setError(null);

            const needsOnboarding = await resolveNeedsOnboarding();

            setState((s) => ({
                ...s,
                needsOnboarding,
            }));

            setReady(true);
            scheduleAutoLogout();
        } catch (e: any) {
            // eslint-disable-next-line no-console
            console.error("AppSession.refresh failed", e);

            setError(e?.message ?? "Error loading session state");
            setReady(true);
            scheduleAutoLogout();
        } finally {
            setBooting(false);
        }
    }, [
        cancelLogoutTimer,
        handleAutoLogout,
        isAuthenticated,
        resolveNeedsOnboarding,
        scheduleAutoLogout,
        user,
    ]);

    const reset = useCallback(() => {
        clearSession();
        clearUiPreferences();
        cancelLogoutTimer();

        setState({
            ready: true,
            booting: false,
            error: null,
            needsOnboarding: false,
        });
    }, [cancelLogoutTimer]);

    // Boot inicial (evitar doble en StrictMode)
    useEffect(() => {
        if (bootedOnce.current) return;
        bootedOnce.current = true;
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Re-evaluar si cambia auth
    useEffect(() => {
        void refresh();
    }, [isAuthenticated, user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

    const value = useMemo<AppSessionContextValue>(
        () => ({
            ...state,
            refresh,
            reset,
        }),
        [state, refresh, reset],
    );

    return <AppSessionContext.Provider value={value}>{children}</AppSessionContext.Provider>;
}

export function useAppSession(): AppSessionContextValue {
    const ctx = useContext(AppSessionContext);
    if (!ctx) throw new Error("useAppSession must be used within AppSessionProvider");
    return ctx;
}