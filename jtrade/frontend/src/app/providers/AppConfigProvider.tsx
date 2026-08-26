import * as React from "react";
import { API_URL } from "@/app/lib/constants";
import type { AppConfig } from "@/app/config/app-config";

const AppConfigContext = React.createContext<AppConfig | null>(null);

export function AppConfigProvider({ children }: { children: React.ReactNode }) {
    const [config, setConfig] = React.useState<AppConfig | null>(null);
    const [failed, setFailed] = React.useState(false);

    React.useEffect(() => {
        let active = true;
        fetch(`${API_URL.replace(/\/$/, "")}/app-config`, { cache: "no-store" })
            .then((response) => response.ok ? response.json() : Promise.reject(new Error("app-config unavailable")))
            .then((raw) => {
                const value = raw?.data ?? raw;
                if (active && value?.contractVersion === 1 && value?.key === "jtrade") setConfig(value);
            })
            .catch(() => { if (active) setFailed(true); });
        return () => { active = false; };
    }, []);

    React.useEffect(() => {
        if (config) document.title = config.name;
    }, [config]);

    React.useEffect(() => {
        if (!config?.theme.faviconUrl) return;
        const link = document.getElementById("app-favicon") as HTMLLinkElement | null;
        if (link) link.href = config.theme.faviconUrl;
    }, [config]);

    if (!config) return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", padding: 24, background: "#f5f5f7", color: "#111116", fontFamily: "-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif" }}><div style={{ textAlign: "center" }}><strong>{failed ? "Application identity unavailable" : "Loading application…"}</strong>{failed && <p style={{ color: "#66666d" }}>JTrade could not load its configuration from Grapifly.</p>}</div></div>;

    return <AppConfigContext.Provider value={config}>{children}</AppConfigContext.Provider>;
}

export function useAppConfig() {
    const config = React.useContext(AppConfigContext);
    if (!config) throw new Error("useAppConfig must be used inside a configured AppConfigProvider");
    return config;
}
