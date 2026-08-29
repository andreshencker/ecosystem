import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import RequireRole from "../guards/RequireRole";
import { NavigationLayout, adminNavigation } from "@/app/navigation";
import ProductsPage from "@/modules/core/products/pages/ProductsPage";
import TypeProjectsPage from "@/modules/core/typeProjects/pages/TypeProjectsPage";

const AdminDashboard = lazy(() => import("@/app/common/pages/admin/admindashboard"));
const PlatformsPage = lazy(() => import("@/pages/platforms/PlatformsPage"));
const NotFound = lazy(() => import("@/app/common/pages/not-found"));

export const adminRoutes: RouteObject[] = [{
    path: "/admin",
    element: <RequireRole role="admin"><NavigationLayout config={adminNavigation}/></RequireRole>,
    children: [
        { index: true, element: <Navigate to="dashboard" replace/> },
        { path: "dashboard", element: <AdminDashboard/> },
        { path: "products", element: <ProductsPage review/> },
        { path: "platforms", element: <PlatformsPage/> },
        { path: "type-projects", element: <TypeProjectsPage/> },
        { path: "*", element: <NotFound/> },
    ],
}];
