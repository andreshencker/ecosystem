import React, { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import RequireRole from "../guards/RequireRole";
import { NavigationLayout } from "@/app/navigation";
import { clientNavigation } from "@/app/navigation";
import MySubscriptionsPage from "@/modules/core/symbolExecution/pages/MySubscriptionsPage";
import MyAccountInfoPage from "@/modules/core/userAccountInfo/pages/MyAccountInfoPage";
import MyUserPlatformsPage from "@/modules/core/userPlatforms/pages/MyUserPlatformsPage";
import MySignalsPage from "@/modules/core/signals/pages/MySignalsPage";
import MyUserProjectPlatformsPage from "@/modules/core/userProjectPlatforms/pages/MyUserProjectPlatformsPage";
import MarketplacePage from "@/modules/core/userProjectPlatforms/pages/MarketplacePage";


const ClientDashboard = lazy(() => import("@/app/common/pages/client/clientdashboard")); // crea este page
const ProfilePage = lazy(() => import("@/modules/core/users/pages/ProfilePage")); // si lo reutilizas

const NotFound = lazy(() => import("@/app/common/pages/not-found"));

export const clientRoutes: RouteObject[] = [
    {
        path: "/client",
        element: (
            <RequireRole role="client">
                <NavigationLayout config={clientNavigation} />
            </RequireRole>
        ),
        children: [
            { path: "dashboard", element: <ClientDashboard /> },

            { path: "profile", element: <ProfilePage /> },
            { path: "subscriptions", element: <MySubscriptionsPage /> },
            { path: "account-info", element: <MyAccountInfoPage /> },
            { path: "my-projects", element: <MyUserProjectPlatformsPage /> },
            { path: "signals/history", element: <MySignalsPage /> },
            { path: "marketplace", element: <MarketplacePage />,}
        ],
    },
];