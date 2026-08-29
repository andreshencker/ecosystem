import React, { Suspense, useEffect } from "react";
import { useLocation, useNavigate, useRoutes } from "react-router-dom";
import { useAuth } from "@/old/modules/core/auth/hooks/useAuth";

import { publicRoutes } from "./routes/public.routes";
import { adminRoutes } from "./routes/admin.routes";
import { clientRoutes } from "./routes/client.routes";
import { providerRoutes } from "./routes/provider.routes";
import { resolveLanding } from "./resolve/resolveLanding";

function Loader() {
    return <div style={{ padding: 24 }}>Loading…</div>;
}

export default function AppRouter() {
    const { user, ready, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const { pathname } = useLocation();

    const routesElement = useRoutes([
        ...publicRoutes,
        ...adminRoutes,
        ...clientRoutes,
        ...providerRoutes,
    ]);

    useEffect(() => {
        if (!ready) return;
        if (!isAuthenticated) return;

        const isEntry =
            pathname === "/" ||
            pathname.startsWith("/signin") ||
            pathname.startsWith("/auth/grapifly/callback") ||
            pathname.startsWith("/forgot-password") ||
            pathname.startsWith("/reset-password");

        if (!isEntry) return;

        const to = resolveLanding(user as any);
        if (to && to !== pathname) navigate(to, { replace: true });
    }, [ready, isAuthenticated, user, pathname, navigate]);

    if (!ready) return <Loader />;

    return <Suspense fallback={<Loader />}>{routesElement}</Suspense>;
}
