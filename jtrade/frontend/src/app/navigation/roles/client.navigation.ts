import type { NavigationConfig } from "../types";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import ShowChartRoundedIcon from "@mui/icons-material/ShowChartRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import StorefrontRoundedIcon from "@mui/icons-material/StorefrontRounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
export const clientNavigation: NavigationConfig = {
    role: "client",
    brand: { name: "JTrade", to: "/client/dashboard" },

    layout: {
        hasNavbar: true,
        hasSidebar: true,
        hasPopover: true,
    },

    navbar: [
        { type: "link", label: "Dashboard", path: "/client/dashboard", icon: DashboardRoundedIcon },
        { type: "category", key: "settings", label: "Settings", icon: ShowChartRoundedIcon },
        {
            type: "link", label: "Marketplace", path: "/client/marketplace", icon: StorefrontRoundedIcon,},
    ],

    sidebar: {
        sections: {
            settings: [
                {type: "link", label: "My Projects", path: "/client/my-projects", icon: AccountTreeIcon},
                {type: "link", label: "Account Info", path: "/client/account-info", icon: AccountTreeRoundedIcon},
                {type: "link", label: "My Subscriptions", path: "/client/subscriptions", icon: AccountTreeRoundedIcon},
                {type: "link", label: "Signals History", path: "/client/signals/history", icon: ShowChartRoundedIcon,},
            ],
        },
    },

    general: [
        { label: "Profile", path: "/client/profile", icon: PersonRoundedIcon },
    ],

    popover: {
        items: [
            { key: "profile", label: "Profile", to: "/client/profile", icon: PersonRoundedIcon },
            { key: "logout", label: "Logout", dividerTop: true, icon: LogoutRoundedIcon },
        ],
    },
};