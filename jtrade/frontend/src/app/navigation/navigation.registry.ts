import type { NavigationConfig, RoleKey } from "./types";
import { publicNavigation } from "./roles/public.navigation";
import { adminNavigation } from "./roles/admin.navigation";
import { clientNavigation } from "./roles/client.navigation";
import { providerNavigation } from "./roles/provider.navigation";

export const NAVIGATION_BY_ROLE: Record<RoleKey, NavigationConfig> = {
    public: publicNavigation,
    admin: adminNavigation,
    client: clientNavigation,
    provider: providerNavigation,
};