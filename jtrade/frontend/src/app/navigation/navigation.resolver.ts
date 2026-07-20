import type { NavigationConfig, RoleKey } from "./types";
import { NAVIGATION_BY_ROLE } from "./navigation.registry";

/**
 * Decide config según:
 * - autenticado?
 * - role del user
 */
export function resolveNavigation(params: {
    isAuthenticated: boolean;
    role?: string | null;
}): NavigationConfig {
    const { isAuthenticated, role } = params;

    if (!isAuthenticated) return NAVIGATION_BY_ROLE.public;

    const r = (role ?? "").toLowerCase().trim();
    if (r === "admin") return NAVIGATION_BY_ROLE.admin;
    if (r === "client") return NAVIGATION_BY_ROLE.client;
    if (r === "provider") return NAVIGATION_BY_ROLE.provider;

    return NAVIGATION_BY_ROLE.public;
}

export function resolveRoleKey(params: {
    isAuthenticated: boolean;
    role?: string | null;
}): RoleKey {
    return resolveNavigation(params).role;
}