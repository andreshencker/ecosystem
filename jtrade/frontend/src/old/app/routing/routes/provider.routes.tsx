import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import RequireRole from "../guards/RequireRole";
import { NavigationLayout, providerNavigation } from "@/old/app/navigation";
import ProductsPage from "@/old/modules/core/products/pages/ProductsPage";
import ProviderModuleStatusPage from "@/old/app/common/pages/provider/ProviderModuleStatusPage";

const ProviderDashboard = lazy(() => import("@/old/app/common/pages/provider/providerdashboard"));
const NotFound = lazy(() => import("@/old/app/common/pages/not-found"));

export const providerRoutes: RouteObject[] = [{
    path: "/provider",
    element: <RequireRole role="provider"><NavigationLayout config={providerNavigation}/></RequireRole>,
    children: [
        { index: true, element: <Navigate to="dashboard" replace/> },
        { path: "dashboard", element: <ProviderDashboard/> },
        { path: "products", element: <ProductsPage/> },
        { path: "product-versions", element: <ProviderModuleStatusPage title="Product Versions" description="Version history and downloadable product files will use the new product_versions collection." nextStep="Connect version upload, publishing and platform compatibility to Products."/> },
        { path: "indicators", element: <ProviderModuleStatusPage title="Indicators" description="The indicator module exists in the legacy project and is pending organization-based migration." nextStep="Relate indicators directly to providerOrganizationId and productId."/> },
        { path: "symbols", element: <ProviderModuleStatusPage title="Symbols" description="Provider symbol configuration is preserved for the trading-tools migration." nextStep="Remove the old company-provider dependency and scope symbols by Grapifly organization."/> },
        { path: "alerts", element: <ProviderModuleStatusPage title="Alerts" description="Alert management is preserved but still depends on the previous indicator-project model." nextStep="Connect alerts to products, indicators and symbols under the provider organization."/> },
        { path: "webhooks", element: <ProviderModuleStatusPage title="Webhooks" description="Webhook configuration is part of the trading runtime and remains pending migration." nextStep="Define the new product event contract and organization-scoped webhook endpoints."/> },
        { path: "*", element: <NotFound/> },
    ],
}];
