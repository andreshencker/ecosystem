import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import RequireRole from "../guards/RequireRole";
import { NavigationLayout, adminNavigation } from "@/old/app/navigation";

const AdminDashboard = lazy(() => import("@/old/app/common/pages/admin/admindashboard"));
const ProductsPage = lazy(() => import("@/pages/products/ProductsPage"));
const PlatformsPage = lazy(() => import("@/pages/platforms/PlatformsPage"));
const ProductTypesPage = lazy(() => import("@/pages/product-types/ProductTypesPage"));
const NotFound = lazy(() => import("@/old/app/common/pages/not-found"));

export const adminRoutes: RouteObject[] = [{
    path: "/admin",
    element: <RequireRole role="admin"><NavigationLayout config={adminNavigation}/></RequireRole>,
    children: [
        { index: true, element: <Navigate to="dashboard" replace/> },
        { path: "dashboard", element: <AdminDashboard/> },
        { path: "products", element: <ProductsPage review/> },
        { path: "platforms", element: <PlatformsPage/> },
        { path: "product-types", element: <ProductTypesPage/> },
        { path: "*", element: <NotFound/> },
    ],
}];
