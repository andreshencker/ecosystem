import type { StoredUser } from "@/app/lib/storage";

export function resolveLanding(user: StoredUser | null): string {
    if (!user) return "/signin";

    const role = String((user as any)?.role ?? "")
        .toLowerCase()
        .trim();

    if (role === "admin") return "/admin/dashboard";
    if (role === "client") return "/client/dashboard";
    if (role === "provider") return "/provider/dashboard";

    return "/unauthorized";
}