import { lazy } from "react";
import { Navigate } from "react-router-dom";
import type { RouteObject } from "react-router-dom";
import RequireRole from "../guards/RequireRole";
import { NavigationLayout, providerNavigation } from "@/old/app/navigation";
import ProviderModuleStatusPage from "@/old/app/common/pages/provider/ProviderModuleStatusPage";

const ProviderDashboard = lazy(() => import("@/old/app/common/pages/provider/providerdashboard"));
const ProductsPage = lazy(() => import("@/pages/products/ProductsPage"));
const ProductVersionsPage = lazy(() => import("@/pages/product-versions/ProductVersionsPage"));
const TeamPage = lazy(() => import("@/pages/team/TeamPage"));
const MyOrganizationPage = lazy(() => import("@/pages/organization/MyOrganizationPage"));
const ProviderIndicatorsPage = lazy(() => import("@/pages/indicators/ProviderIndicatorsPage"));
const ProviderSymbolsPage = lazy(() => import("@/pages/symbols/ProviderSymbolsPage"));
const ProviderAlertsPage = lazy(() => import("@/pages/alerts/ProviderAlertsPage"));
const ProviderSalesPage = lazy(() => import("@/pages/sales/ProviderSalesPage"));
const ProviderPricingPage = lazy(() => import("@/pages/pricing/ProviderPricingPage"));
const ProviderProductParamsPage = lazy(() => import("@/pages/product-params/ProviderProductParamsPage"));
const NotFound = lazy(() => import("@/old/app/common/pages/not-found"));

export const providerRoutes: RouteObject[] = [{
    path: "/provider",
    element: <RequireRole role="provider"><NavigationLayout config={providerNavigation}/></RequireRole>,
    children: [
        { index: true, element: <Navigate to="dashboard" replace/> },
        { path: "dashboard", element: <ProviderDashboard/> },
        { path: "organization", element: <MyOrganizationPage/> },
        { path: "team", element: <TeamPage/> },
        { path: "products", element: <ProductsPage/> },
        { path: "product-versions", element: <ProductVersionsPage/> },
        { path: "product-params", element: <ProviderProductParamsPage/> },
        { path: "pricing", element: <ProviderPricingPage/> },
        { path: "sales", element: <ProviderSalesPage/> },
        { path: "indicators", element: <ProviderIndicatorsPage/> },
        { path: "symbols", element: <ProviderSymbolsPage/> },
        { path: "alerts", element: <ProviderAlertsPage/> },
        { path: "webhooks", element: <ProviderModuleStatusPage title="Webhooks" description="Webhook configuration is part of the trading runtime and remains pending migration." nextStep="Define the new product event contract and organization-scoped webhook endpoints."/> },
        { path: "*", element: <NotFound/> },
    ],
}];
