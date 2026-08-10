import React, { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import RequireRole from "../guards/RequireRole";
import { NavigationLayout } from "@/app/navigation";
import { adminNavigation } from "@/app/navigation";


import IndicatorsAdminView from "@/modules/core/indicators/pages/IndicatorsAdminView";
import AdminUserPlatformsAllPage from "@/modules/core/userPlatforms/pages/AdminUserPlatformsAllPage";
import AdminMyPlatformsPage from "@/modules/core/userPlatforms/pages/AdminMyPlatformsPage";
import AdminSignalsHistoryPage from "@/modules/core/signals/pages/AdminSignalsHistoryPage";
import AdminCodeProjectsPage from "@/modules/core/codeProjects/pages/AdminCodeProjectsPage";
import AdminCodeProjectVersionsPage from "@/modules/core/codeProjectVersions/pages/AdminCodeProjectVersionsPage";
import TypeProjectsPage from "@/modules/core/typeProjects/pages/TypeProjectsPage";
import AdminProjectCodePlatformsPage from "@/modules/core/projectCodePlatforms/pages/AdminProjectCodePlatformsPage";
import AdminUserProjectPlatformsPage from "@/modules/core/userProjectPlatforms/pages/AdminUserProjectPlatformsPage";
import AdminIndicatorProjectsPage from "@/modules/core/indicatorProjects/pages/AdminIndicatorProjectsPage";

const AdminDashboard = lazy(() => import("@/app/common/pages/admin/admindashboard"));
const AdminSettings = lazy(() => import("@/app/common/pages/admin/adminsettings"));
const PlatformsPage = lazy(() => import("@/modules/core/platforms/pages/PlatformsPage"));
const UsersManagerPage = lazy(() => import("@/modules/core/users/pages/AdminUsersPage.tsx"));
const ProfilePage = lazy(() => import("@/modules/core/users/pages/ProfilePage"));
const NotFound = lazy(() => import("@/app/common/pages/not-found"));

export const adminRoutes: RouteObject[] = [
    {
        path: "/admin",
        element: (
            <RequireRole role="admin">
                <NavigationLayout config={adminNavigation} />
            </RequireRole>
        ),
        children: [
            { path: "dashboard", element: <AdminDashboard /> },
            { path: "settings", element: <AdminSettings /> },
            { path: "platforms", element: <PlatformsPage /> },
            { path: "users", element: <UsersManagerPage /> },
            { path: "profile", element: <ProfilePage /> },

            { path: "indicators", element: <IndicatorsAdminView /> },
            { path: "signals/history", element: <AdminSignalsHistoryPage /> },
            { path: "user-platforms/all", element: <AdminUserPlatformsAllPage /> },
            { path: "my-platforms", element: <AdminMyPlatformsPage /> },
            { path: "code-projects", element: <AdminCodeProjectsPage /> },
            { path: "project-code-platforms", element: <AdminProjectCodePlatformsPage /> },
            { path: "code-project-versions", element: <AdminCodeProjectVersionsPage /> },
            { path: "type-projects", element: <TypeProjectsPage /> },
            { path: "user-project-platforms", element: <AdminUserProjectPlatformsPage /> },
            {path: "/admin/indicator-projects", element: <AdminIndicatorProjectsPage />,},

            { path: "*", element: <NotFound /> },
        ],
    },
];
