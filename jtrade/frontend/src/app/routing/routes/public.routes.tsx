import React, { lazy } from "react";
import type { RouteObject } from "react-router-dom";

import { NavigationLayout } from "@/app/navigation";
import { publicNavigation } from "@/app/navigation";
import VerifyEmailPage from "@/modules/core/auth/pages/VerifyEmailPage";

const HomePage = lazy(() => import("@/app/common/pages/Home"));
const LoginPage = lazy(() => import("@/modules/core/auth/pages/SignInPage"));
const ForgotPasswordPage = lazy(() => import("@/modules/core/auth/pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("@/modules/core/auth/pages/ResetPasswordPage"));
const Unauthorized = lazy(() => import("@/app/common/pages/UnAuthorized"));
const NotFound = lazy(() => import("@/app/common/pages/not-found"));

export const publicRoutes: RouteObject[] = [
    {
        path: "/",
        element: <NavigationLayout config={publicNavigation} />,
        children: [
            { index: true, element: <HomePage /> },
            { path: "signin", element: <LoginPage /> },
            { path: "verify-email", element: <VerifyEmailPage /> },

            { path: "forgot-password", element: <ForgotPasswordPage /> },
            { path: "reset-password", element: <ResetPasswordPage /> },

            { path: "unauthorized", element: <Unauthorized /> },
            { path: "*", element: <NotFound /> },
        ],
    },
];