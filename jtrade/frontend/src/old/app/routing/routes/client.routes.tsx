import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import RequireRole from "../guards/RequireRole";
import { NavigationLayout, clientNavigation } from "@/old/app/navigation";

const ClientDashboard = lazy(() => import("@/old/app/common/pages/client/clientdashboard"));
const NotFound = lazy(() => import("@/old/app/common/pages/not-found"));

export const clientRoutes: RouteObject[] = [{
    path: "/client",
    element: <RequireRole role="client"><NavigationLayout config={clientNavigation}/></RequireRole>,
    children: [
        { index: true, element: <Navigate to="dashboard" replace/> },
        { path: "dashboard", element: <ClientDashboard/> },
        { path: "*", element: <NotFound/> },
    ],
}];
