import type { NavigationConfig } from "../types";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import SmartToyRoundedIcon from "@mui/icons-material/SmartToyRounded";
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
                { label: "Marketplace", path: "/client/marketplace", icon: StorefrontRoundedIcon },
                { label: "Signal Bot", path: "/client/signalbots", icon: SmartToyRoundedIcon },
                { label: "My Purchases", path: "/client/orders", icon: ReceiptLongRoundedIcon },
            ],
        },
    },
    general: [],
    popover: { items: [{ key: "logout", label: "Logout", dividerTop: true, icon: LogoutRoundedIcon }] },
};
