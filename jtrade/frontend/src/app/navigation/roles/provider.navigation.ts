import type { NavigationConfig } from "../types";

import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import BusinessRoundedIcon from "@mui/icons-material/BusinessRounded";
import FolderZipRoundedIcon from "@mui/icons-material/FolderZipRounded";
import ArchiveRoundedIcon from "@mui/icons-material/ArchiveRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import LogoutRoundedIcon from "@mui/icons-material/LogoutRounded";
import AccountTreeIcon from "@mui/icons-material/AccountTree";
import InsightsRoundedIcon from "@mui/icons-material/InsightsRounded";
import SettingsEthernetIcon from "@mui/icons-material/SettingsEthernet";
import WebhookRoundedIcon from "@mui/icons-material/WebhookRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";

export const providerNavigation: NavigationConfig = {
    role: "provider",

    brand: {
        name: "JTrade Provider",
        to: "/provider/dashboard",
    },

    layout: {
        hasNavbar: true,
        hasSidebar: true,
        hasPopover: true,
    },

    navbar: [
        {
            type: "link",
            label: "Dashboard",
            path: "/provider/dashboard",
            icon: DashboardRoundedIcon,
        },

        {
            type: "category",
            key: "company",
            label: "Company",
            icon: BusinessRoundedIcon,
        },

        {
            type: "category",
            key: "projects",
            label: "Projects",
            icon: FolderZipRoundedIcon,
        },
    ],

    sidebar: {
        sections: {
            company: [
                {
                    label: "Company Profile",
                    path: "/provider/company",
                    icon: BusinessRoundedIcon,
                },
            ],

            projects: [
                {
                    label: "Code Projects",
                    path: "/provider/projects",
                    icon: FolderZipRoundedIcon,
                },

                {
                    label: "Project Platforms",
                    path: "/provider/project-platforms",
                    icon: AccountTreeIcon,
                },

                {
                    label: "Code Versions",
                    path: "/provider/versions",
                    icon: ArchiveRoundedIcon,
                },
                {
                    label: "Indicators",
                    path: "/provider/indicators",
                    icon: InsightsRoundedIcon,
                },
                {
                    label: "Indicator Projects",
                    path: "/provider/indicator-projects",
                    icon: SettingsEthernetIcon,
                },
                {
                    label: "Webhooks",
                    path: "/provider/admin-indicators",
                    icon: WebhookRoundedIcon, // 🪝 webhooks (el correcto real)
                },
                {
                    label: "Alerts",
                    path: "/provider/alerts",
                    icon: NotificationsActiveRoundedIcon, // 🔔 alertas
                },
                {
                    label: "Symbols",
                    path: "/provider/symbols",
                    icon: InsightsRoundedIcon,
                },

            ],
        },
    },

    general: [
        {
            label: "Profile",
            path: "/provider/profile",
            icon: PersonRoundedIcon,
        },
    ],

    popover: {
        items: [
            {
                key: "profile",
                label: "Profile",
                to: "/provider/profile",
                icon: PersonRoundedIcon,
            },

            {
                key: "logout",
                label: "Logout",
                dividerTop: true,
                icon: LogoutRoundedIcon,
            },
        ],
    },
};