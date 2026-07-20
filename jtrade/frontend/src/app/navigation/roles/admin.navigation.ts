import type { NavigationConfig } from "../types";
import PeopleAltRoundedIcon from "@mui/icons-material/PeopleAltRounded";
import HubRoundedIcon from "@mui/icons-material/HubRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import CampaignRoundedIcon from "@mui/icons-material/CampaignRounded";
import LanRoundedIcon from "@mui/icons-material/LanRounded";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import FolderZipRoundedIcon from "@mui/icons-material/FolderZipRounded";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";

export const adminNavigation: NavigationConfig = {
    role: "admin",
    brand: { name: "JTrade Admin", to: "/admin/dashboard" },

    layout: {
        hasNavbar: true,
        hasSidebar: true,
        hasPopover: true,
    },

    navbar: [
        { type: "link", label: "Dashboard", path: "/admin/dashboard", icon: DashboardRoundedIcon },

        { type: "category", key: "administration", label: "Administration", icon: PeopleAltRoundedIcon },
        { type: "category", key: "communications", label: "Communications", icon: CampaignRoundedIcon },
        { type: "category", key: "integrations", label: "Integrations", icon: LanRoundedIcon },
    ],

    sidebar: {
        sections: {
            administration: [
                {
                    label: "Users",
                    path: "/admin/users",
                    icon: PeopleAltRoundedIcon, // 👥 usuarios
                },
                {
                    label: "Platforms",
                    path: "/admin/platforms",
                    icon: AccountTreeIcon, // 🌐 plataformas globales
                },
                {
                    label: "My Platforms",
                    path: "/admin/my-platforms",
                    icon: HubRoundedIcon, // 🔗 conexiones propias
                },
                {
                    label: "Signals History",
                    path: "/admin/signals/history",
                    icon: InsightsRoundedIcon,
                },
                {
                    label: "User platforms list",
                    path: "/admin/user-platforms/all",
                    icon: ManageAccountsRoundedIcon, // 👤⚙️ gestión plataformas por usuario
                },

                {
                    label: "Indicator Projects",
                    path: "/admin/indicator-projects",
                    icon: SettingsEthernetIcon ,
                },
                {
                    label: "Indicators",
                    path: "/admin/indicators",
                    icon: InsightsRoundedIcon, // 📈 indicadores
                },

                {
                    label: "Type Projects",
                    path: "/admin/type-projects",
                    icon: AccountTreeIcon,
                },
                {
                    label: "Code Projects",
                    path: "/admin/code-projects",
                    icon: FolderZipRoundedIcon,
                },
                {
                    label: "Code Versions",
                    path: "/admin/code-project-versions",
                    icon: ArchiveRoundedIcon,
                },
            ],
            communications: [
                { label: "Company", path: "/admin/company-info", icon: BusinessRoundedIcon },
                { label: "Company themes", path: "/admin/company-themes", icon: CampaignRoundedIcon },
                { label: "Layout templates", path: "/admin/layout-templates", icon: CampaignRoundedIcon },
                { label: "Notifications", path: "/admin/notifications", icon: CampaignRoundedIcon },
                { label: "Domain catalogue", path: "/admin/domain-catalogue", icon: CampaignRoundedIcon },
            ],
            integrations: [
                { label: "Binance", path: "/admin/binance", icon: LanRoundedIcon },
                { label: "MT5", path: "/admin/mt5", icon: LanRoundedIcon },
            ],
        },
    },

    general: [
        { label: "Profile", path: "/admin/profile", icon: PersonRoundedIcon },

    ],

    popover: {
        items: [
            { key: "profile", label: "Profile", to: "/admin/profile", icon: PersonRoundedIcon },
            { key: "logout", label: "Logout", dividerTop: true, icon: LogoutRoundedIcon },
        ],
    },
};