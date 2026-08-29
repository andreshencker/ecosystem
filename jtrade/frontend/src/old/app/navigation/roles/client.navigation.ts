import type { NavigationConfig } from "../types";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

export const clientNavigation: NavigationConfig = {
    role: "client",
    brand: { to: "/client/dashboard" },
    layout: { hasNavbar: true, hasSidebar: true, hasPopover: true },
    navbar: [
        { type: "category", key: "workspace", label: "Workspace", icon: DashboardRoundedIcon },
    ],
    sidebar: {
        sections: {
            workspace: [
                { label: "Dashboard", path: "/client/dashboard", icon: DashboardRoundedIcon },
            ],
        },
    },
    general: [],
    popover: { items: [{ key: "logout", label: "Logout", dividerTop: true, icon: LogoutRoundedIcon }] },
};
