import type { NavigationConfig, RoleKey } from "./types";
import { NAVIGATION_BY_ROLE } from "./navigation.registry";
import type { StoredUser } from "@/lib/storage";
import { routeRoleForUser } from "@/old/app/routing/resolve/resolveAccessFlow";

/**
 * Decide config según:
 * - autenticado?
 * - role del user
 */
export function resolveNavigation(params: {
    isAuthenticated: boolean;
    role?: string | null;
    user?: StoredUser | null;
}): NavigationConfig {
    const { isAuthenticated, role, user } = params;

    if (!isAuthenticated) return NAVIGATION_BY_ROLE.public;

    const r = routeRoleForUser(user ?? ({ role } as StoredUser));
    if (r === "admin") return NAVIGATION_BY_ROLE.admin;
    if (r === "client") return NAVIGATION_BY_ROLE.client;
    if (r === "provider") return NAVIGATION_BY_ROLE.provider;

    return NAVIGATION_BY_ROLE.public;
}

export function resolveRoleKey(params: {
    isAuthenticated: boolean;
    role?: string | null;
    user?: StoredUser | null;
}): RoleKey {
    return resolveNavigation(params).role;
}
