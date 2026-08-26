// src/app/common/theme/AppThemeProvider.tsx
import * as React from "react";
import {CssBaseline, GlobalStyles, PaletteMode, ThemeProvider as MUIThemeProvider, useMediaQuery} from "@mui/material";
import {makeTheme} from "./makeTheme";
import {useAppConfig} from "@/app/providers/AppConfigProvider";

type Ctx = { mode: PaletteMode; setMode: (m: PaletteMode) => void; toggle: () => void; };
const ThemeCtx = React.createContext<Ctx | undefined>(undefined);

const STORAGE_KEY = "ui:theme"; // "dark" | "light" | "system"

export function AppThemeProvider({children}: { children: React.ReactNode }) {
    const appConfig = useAppConfig();
    // preferencia del sistema
    const systemPrefersDark = useMediaQuery("(prefers-color-scheme: dark)");
    const [pref, setPref] = React.useState<"dark" | "light" | "system">(() => {
        return (localStorage.getItem(STORAGE_KEY) as any) || "system";
    });

    const mode: PaletteMode = React.useMemo(() => {
        if (pref === "system") return systemPrefersDark ? "dark" : "light";
        return pref;
    }, [pref, systemPrefersDark]);

    const setMode = (m: PaletteMode) => {
        setPref(m);
        localStorage.setItem(STORAGE_KEY, m);
    };
    const toggle = () => setMode(mode === "dark" ? "light" : "dark");

    // The catalogue is the only source of theme data — no local merge/fallback.
    const theme = React.useMemo(() => makeTheme(appConfig, mode), [appConfig, mode]);

    return (
        <ThemeCtx.Provider value={{mode, setMode, toggle}}>
            <MUIThemeProvider theme={theme}>
                {/* Reseteo y tipografía base */}
                <CssBaseline/>
                <GlobalStyles
                    styles={{
                        ":root": {
                            "--app-primary": theme.palette.primary.main,
                            "--app-background": theme.palette.background.default,
                            "--app-text": theme.palette.text.primary,
                        },
                        html: {height: "100%"},
                        body: {
                            height: "100%",
                            background: theme.palette.background.default,
                            color: theme.palette.text.primary,
                            WebkitFontSmoothing: "antialiased",
                            MozOsxFontSmoothing: "grayscale",
                        },
                        "#root": {minHeight: "100%"},
                    }}
                />
                {children}
            </MUIThemeProvider>
        </ThemeCtx.Provider>
    );
}

export function useThemeMode() {
    const ctx = React.useContext(ThemeCtx);
    if (!ctx) throw new Error("useThemeMode must be used inside <AppThemeProvider>");
    return ctx;
}
