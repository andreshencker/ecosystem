import * as React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/modules/core/auth/hooks/useAuth";

type Props = {
    role: "admin" | "client" | "provider";
    children: React.ReactNode;
};

export default function RequireRole({ role, children }: Props) {
    const { user, ready, isAuthenticated } = useAuth();

    if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;
    if (!isAuthenticated) return <Navigate to="/signin" replace />;

    const r = String(user?.role ?? "").toLowerCase().trim();
    if (r !== role) return <Navigate to="/unauthorized" replace />;

    return <>{children}</>;
}