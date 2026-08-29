// src/lib/constants.ts

/**
 * Base URL del backend CORE (3002)
 * Se define por variable de entorno.
 * Fallback seguro para desarrollo.
 */
export const API_URL: string =
    (import.meta.env.VITE_API_BASE as string)?.trim() ||
    "http://localhost:3002";

/** Prefijo para claves en localStorage (evita colisiones entre apps) */
export const STORAGE_PREFIX = "Jtrade";

/** Roles soportados (debes alinear con tu backend) */
export enum UserRole {
    ADMIN = "admin",
    CLIENT = "client",
    PROVIDER = "provider",
}

/** Timeout por defecto de las peticiones HTTP (ms) */
export const HTTP_TIMEOUT = 25_000;

/** Nombre de la cabecera HTTP usada para el token */
export const AUTH_HEADER = "Authorization";
