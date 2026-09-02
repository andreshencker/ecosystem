import type { NavigationConfig } from "../types";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

export const adminNavigation: NavigationConfig = {
    role: "admin",
    brand: { to: "/admin/dashboard" },
    layout: { hasNavbar: true, hasSidebar: true, hasPopover: true },
    navbar: [
        { type: "link", label: "Dashboard", path: "/admin/dashboard", icon: DashboardRoundedIcon },
        { type: "category", key: "catalogue", label: "Catalogue", icon: Inventory2RoundedIcon },
    ],
    sidebar: { sections: { catalogue: [
        { label: "Product review", path: "/admin/products", icon: Inventory2RoundedIcon },
        { label: "Product types", path: "/admin/product-types", icon: AccountTreeIcon },
        { label: "Platforms", path: "/admin/platforms", icon: AccountTreeIcon },
    ] } },
    general: [],
    popover: { items: [{ key: "logout", label: "Logout", dividerTop: true, icon: LogoutRoundedIcon }] },
};
