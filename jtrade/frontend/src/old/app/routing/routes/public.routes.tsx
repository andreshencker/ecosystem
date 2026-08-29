import React, { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import { NavigationLayout } from "@/old/app/navigation";
import { publicNavigation } from "@/old/app/navigation";

const HomePage = lazy(() => import("@/old/app/common/pages/Home"));
const MarketplacePage = lazy(() => import("@/old/app/common/pages/Marketplace"));
const DevelopersPage = lazy(() => import("@/old/app/common/pages/Developers"));
const HowItWorksPage = lazy(() => import("@/old/app/common/pages/HowItWorks"));
const PlatformsPage = lazy(() => import("@/old/app/common/pages/Platforms"));
const LoginPage = lazy(() => import("@/old/modules/core/auth/pages/SignInPage"));
const GrapiflyCallbackPage = lazy(() => import("@/old/modules/core/auth/pages/GrapiflyCallbackPage"));
const Unauthorized = lazy(() => import("@/old/app/common/pages/UnAuthorized"));
const NotFound = lazy(() => import("@/old/app/common/pages/not-found"));

export const publicRoutes: RouteObject[] = [
    { path: "/signin", element: <LoginPage /> },
    { path: "/provider/signin", element: <LoginPage flow="provider" /> },
    { path: "/auth/grapifly/callback", element: <GrapiflyCallbackPage /> },
    {
        path: "/",
        element: <NavigationLayout config={publicNavigation} />,
        children: [
            { index: true, element: <HomePage /> },
            { path: "marketplace", element: <MarketplacePage /> },
            { path: "developers", element: <DevelopersPage /> },
            { path: "how-it-works", element: <HowItWorksPage /> },
            { path: "platforms", element: <PlatformsPage /> },
            { path: "unauthorized", element: <Unauthorized /> },
            { path: "*", element: <NotFound /> },
        ],
    },
];
