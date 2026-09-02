export type AppConfig = {
    contractVersion: 1;
    key: "jtrade";
    name: string;
    description: string;
    launchUrl: string;
    theme: {
        icon: string;
        logoUrl: string | null;
        logoUrlDark: string | null;
        faviconUrl: string | null;
        fontFamily: string;
        light: { primaryColor: string; primaryContrastText: string; backgroundColor: string; textColor: string };
        dark: { primaryColor: string; primaryContrastText: string; backgroundColor: string; textColor: string };
    };
    allowedFlows: ("client" | "provider" | "internal")[];
};

/** Picks the mode-correct logo — logoUrlDark in dark mode if set, otherwise the default logoUrl. */
export function resolveLogoUrl(theme: AppConfig["theme"], mode: "light" | "dark"): string | undefined {
    return (mode === "dark" ? theme.logoUrlDark : null) ?? theme.logoUrl ?? undefined;
}
