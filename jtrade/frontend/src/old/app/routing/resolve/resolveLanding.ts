import type { StoredUser } from "@/lib/storage";
import { resolveAccessFlow } from "./resolveAccessFlow";

export function resolveLanding(user: StoredUser | null): string {
    if (!user) return "/signin";

    const flow = resolveAccessFlow(user);
    if (flow === "internal") return "/admin/dashboard";
    if (flow === "client") return "/client/dashboard";
    if (flow === "provider") return "/provider/dashboard";

    return "/unauthorized";
}
