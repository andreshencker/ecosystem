import type { NavigationConfig } from "../types";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import CurrencyExchangeRoundedIcon from "@mui/icons-material/CurrencyExchangeRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";
import WebhookRoundedIcon from "@mui/icons-material/WebhookRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";

export const providerNavigation: NavigationConfig = {
    role: "provider",
    brand: { to: "/provider/dashboard" },
    layout: { hasNavbar: true, hasSidebar: true, hasPopover: true },
    navbar: [
        { type: "category", key: "workspace", label: "Workspace", icon: DashboardRoundedIcon },
        { type: "category", key: "products", label: "Products", icon: Inventory2RoundedIcon },
        { type: "category", key: "trading-tools", label: "Trading Tools", icon: InsightsRoundedIcon },
    ],
    sidebar: {
        sections: {
            workspace: [
                { label: "Dashboard", path: "/provider/dashboard", icon: DashboardRoundedIcon },
            ],
            products: [
                { label: "Products", path: "/provider/products", icon: Inventory2RoundedIcon },
                { label: "Product Versions", path: "/provider/product-versions", icon: ArchiveRoundedIcon },
            ],
            "trading-tools": [
                { label: "Indicators", path: "/provider/indicators", icon: InsightsRoundedIcon },
                { label: "Symbols", path: "/provider/symbols", icon: CurrencyExchangeRoundedIcon },
                { label: "Alerts", path: "/provider/alerts", icon: NotificationsActiveRoundedIcon },
                { label: "Webhooks", path: "/provider/webhooks", icon: WebhookRoundedIcon },
            ],
        },
    },
    general: [],
    popover: { items: [{ key: "logout", label: "Logout", dividerTop: true, icon: LogoutRoundedIcon }] },
};
