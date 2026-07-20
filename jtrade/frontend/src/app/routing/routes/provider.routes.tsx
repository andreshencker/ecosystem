import React, { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import RequireRole from "../guards/RequireRole";
import { NavigationLayout } from "@/app/navigation";
import { providerNavigation } from "@/app/navigation";

import ProviderCompanyPage from "@/modules/core/companyProviders/pages/ProviderCompanyPage";
import ProviderCodeProjectsPage from "@/modules/core/codeProjects/pages/ProviderCodeProjectsPage";
import ProviderProjectCodePlatformsPage
    from "@/modules/core/projectCodePlatforms/pages/ProviderProjectCodePlatformsPage";
import ProviderCodeProjectVersionsPage from "@/modules/core/codeProjectVersions/pages/ProviderCodeProjectVersionsPage";
import ProviderIndicatorsPage from "@/modules/core/indicators/pages/ProviderIndicatorsPage";
import ProviderIndicatorProjectsPage from "@/modules/core/indicatorProjects/pages/ProviderIndicatorProjectsPage";
import AdminIndicatorsPage from "@/modules/core/adminIndicators/pages/AdminIndicatorsPage";
import AlertsAdminPanel from "@/modules/core/alerts/pages/AlertsAdminPanel";
import ProviderSymbolsPage from "@/modules/core/symbols/pages/ProviderSymbolsPage";

const ProviderDashboard = lazy(() => import("@/app/common/pages/provider/providerdashboard"));
const ProfilePage = lazy(() => import("@/modules/core/users/pages/ProfilePage"));
const NotFound = lazy(() => import("@/app/common/pages/not-found"));

export const providerRoutes: RouteObject[] = [
    {
        path: "/provider",
        element: (
            <RequireRole role="provider">
                <NavigationLayout config={providerNavigation} />
            </RequireRole>
        ),
        children: [
            { path: "dashboard", element: <ProviderDashboard /> },
            { path: "profile", element: <ProfilePage /> },

            { path: "company", element: <ProviderCompanyPage /> },
            { path: "projects", element: <ProviderCodeProjectsPage /> },
            { path: "project-platforms", element: <ProviderProjectCodePlatformsPage /> },
            { path: "versions", element: <ProviderCodeProjectVersionsPage /> },
            { path: "indicators", element: <ProviderIndicatorsPage />,},
            {path: "indicator-projects", element: <ProviderIndicatorProjectsPage />,},
            { path: "admin-indicators", element: <AdminIndicatorsPage /> },
            { path: "alerts", element: <AlertsAdminPanel /> },
            { path: "symbols", element: <ProviderSymbolsPage /> },
            { path: "*", element: <NotFound /> },
        ],
    },
];