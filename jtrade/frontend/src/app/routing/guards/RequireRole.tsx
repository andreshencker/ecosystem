import * as React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/modules/core/auth/hooks/useAuth";
import { resolveLanding } from "../resolve/resolveLanding";
import { routeRoleForUser } from "../resolve/resolveAccessFlow";

type Props = {
    role: "admin" | "client" | "provider";
    children: React.ReactNode;
};

export default function RequireRole({ role, children }: Props) {
    const { user, ready, isAuthenticated } = useAuth();

    if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;
    if (!isAuthenticated) return <Navigate to="/signin" replace />;

    const resolvedRole = routeRoleForUser(user);
    if (resolvedRole !== role) return <Navigate to={resolveLanding(user)} replace />;

    return <>{children}</>;
}
