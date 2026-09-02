import type { StoredUser } from "@/lib/storage";

export type AccessFlow = "client" | "provider" | "internal";
export type RouteRole = "client" | "provider" | "admin";

export function resolveAccessFlow(user: StoredUser | null): AccessFlow | null {
    if (!user) return null;

    const rawFlow = String(user.flow ?? "").toLowerCase().trim();
    if (rawFlow === "client" || rawFlow === "provider" || rawFlow === "internal") {
        return rawFlow;
    }

    // Compatibility only for sessions created before Grapifly started sending
    // the canonical flow in the SSO contract.
    const rawRole = String(user.role ?? "").toLowerCase().trim();
    if (rawRole === "client") return "client";
    if (rawRole === "provider") return "provider";
    if (rawRole === "admin" || rawRole === "internal") return "internal";

    return null;
}

export function routeRoleForUser(user: StoredUser | null): RouteRole | null {
    const flow = resolveAccessFlow(user);
    if (flow === "internal") return "admin";
    return flow;
}

