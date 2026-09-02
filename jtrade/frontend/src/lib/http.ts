// src/lib/http.ts
import axios, {AxiosError} from "axios";
import {API_URL, HTTP_TIMEOUT} from "./constants";
import {clearSession, getRefreshToken, getToken, setRefreshToken, setToken,} from "./storage";
import toast from "react-hot-toast";

/**
 * Axios central:
 * - baseURL desde VITE_API_URL
 * - inyecta Authorization si hay token
 * - intenta refrescar el token en 401
 */
const http = axios.create({
    baseURL: API_URL,
    timeout: HTTP_TIMEOUT,
    withCredentials: false,
});

// ---- Helpers públicos para fijar/quitar el header global ----
export function setAuthHeader(token: string | null) {
    if (token) {
        http.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    } else {
        delete http.defaults.headers.common["Authorization"];
    }
}

export function clearAuthHeader() {
    delete http.defaults.headers.common["Authorization"];
}

// =====================================================
//    LÓGICA DE REFRESH TOKEN
// =====================================================
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

/**
 * Llama al endpoint /auth/refresh usando el refreshToken guardado en storage.
 * Devuelve el nuevo accessToken o null si falla.
 */
async function doRefreshToken(): Promise<string | null> {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;

    try {
        const resp = await axios.post(
            `${API_URL}/auth/refresh`,
            {refreshToken},
            {timeout: HTTP_TIMEOUT}
        );

        // Esperamos un shape: { user, tokens: { accessToken, refreshToken } }
        const data = resp.data as {
            user?: any;
            tokens?: { accessToken: string; refreshToken?: string };
        };

        const newAccess = data.tokens?.accessToken;
        const newRefresh = data.tokens?.refreshToken;

        if (!newAccess) {
            throw new Error("No access token in refresh response");
        }

        // Guardar tokens en storage y en headers globales
        setToken(newAccess);
        setRefreshToken(newRefresh ?? null);
        setAuthHeader(newAccess);

        return newAccess;
    } catch (err) {
        // Si el refresh falla, limpiamos todo
        clearSession();
        clearAuthHeader();
        toast.error("Your session has expired. Please sign in again.");
        // Redirigimos al login
        window.location.href = "/signin";
        return null;
    }
}

// ---- Interceptor de REQUEST ----
http.interceptors.request.use((config) => {
    // fallback: si no hay header seteado globalmente, usa el token del storage
    if (!config.headers?.Authorization) {
        const token = getToken();
        if (token) {
            config.headers = config.headers ?? {};
            (config.headers as any).Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// ---- Interceptor de RESPONSE ----
http.interceptors.response.use(
    (r) => r,
    async (error: AxiosError) => {
        const status = error.response?.status;
        const originalRequest: any = error.config || {};

        // Marcamos flags por compatibilidad (por si los usas en otro lado)
        if (status === 403) {
            (error as any).isAuthForbidden = true;
        }

        // Si NO es 401 → devolvemos el error normal
        if (status !== 401) {
            return Promise.reject(error);
        }

        // Endpoints de autenticación: un 401 aquí es un fallo de credenciales
        // (código SSO inválido, refresh expirado…), NO una sesión caducada.
        // Nunca disparamos el ciclo refresh→retry→redirect por ellos.
        const reqUrl = String(originalRequest?.url ?? "");
        if (/\/auth\/(grapifly|refresh|logout)/.test(reqUrl)) {
            return Promise.reject(error);
        }

        // Ya reintentamos una vez este request y volvió a fallar → logout
        if (originalRequest._retry) {
            (error as any).isAuthUnauthorized = true;
            clearSession();
            clearAuthHeader();
            toast.error("Your session has expired. Please sign in again.");
            window.location.href = "/signin";
            return Promise.reject(error);
        }

        // Si no hay refresh token, no podemos refrescar → logout
        const rt = getRefreshToken();
        if (!rt) {
            (error as any).isAuthUnauthorized = true;
            clearSession();
            clearAuthHeader();
            toast.error("Your session has expired. Please sign in again.");
            window.location.href = "/signin";
            return Promise.reject(error);
        }

        originalRequest._retry = true;

        // Evitar múltiples llamadas simultáneas al endpoint /auth/refresh
        if (!isRefreshing) {
            isRefreshing = true;
            refreshPromise = doRefreshToken().finally(() => {
                isRefreshing = false;
                refreshPromise = null;
            });
        }

        // Esperamos a que se resuelva el refresh
        const newToken = await (refreshPromise as Promise<string | null>);

        if (!newToken) {
            // El refresh falló → ya se limpió la sesión en doRefreshToken
            return Promise.reject(error);
        }

        // Reintentamos la request original con el nuevo token
        originalRequest.headers = originalRequest.headers ?? {};
        originalRequest.headers["Authorization"] = `Bearer ${newToken}`;

        return http(originalRequest);
    }
);

// Export por defecto y con nombre para usos mixtos
export const api = http;