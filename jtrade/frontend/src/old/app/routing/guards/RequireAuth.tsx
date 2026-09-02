import * as React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/old/modules/core/auth/hooks/useAuth";

export default function RequireAuth({ children }: { children: React.ReactNode }) {
    const { isAuthenticated, ready } = useAuth();

    if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;
    if (!isAuthenticated) return <Navigate to="/signin" replace />;

    return <>{children}</>;
}