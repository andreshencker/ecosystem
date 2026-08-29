// src/app/common/theme/makeTheme.ts
import { alpha, createTheme, darken, lighten, PaletteMode } from "@mui/material";
import type { AppConfig } from "@/old/app/config/app-config";
import { ECOSYSTEM_COLORS } from "./tokens";

const FALLBACK_FONT_STACK = [
    "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto",
    "Helvetica Neue", "Arial", "Noto Sans",
    "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji",
    "sans-serif",
].join(",");

/**
 * Every color here — except the five ECOSYSTEM_COLORS semantics — comes
 * from (or is mathematically derived from) the Grapifly Applications
 * catalogue (`appConfig.theme`). Nothing is fixed per-app locally; this
 * mirrors relay/frontend/theme/mui-theme.ts so both apps look coherent from
 * the same 3-color catalogue palette.
 */
export const makeTheme = (appConfig: AppConfig, mode: PaletteMode) => {
    const isDark = mode === "dark";
    const palette = appConfig.theme[mode];

    // The app's own brand identity — always from the catalogue.
    const BRAND = palette.primaryColor;
    const BRAND_CONTRAST_TEXT = palette.primaryContrastText;
    const backgroundDefault = palette.backgroundColor;
    const backgroundPaper = isDark ? lighten(backgroundDefault, 0.045) : "#FFFFFF";
    const textPrimary = palette.textColor;
    const textSecondary = alpha(palette.textColor, 0.65);
    const dividerColor = alpha(palette.textColor, isDark ? 0.14 : 0.1);

    // Surfaces derived from the catalogue background, not fixed hex values.
    const appBarBg = isDark ? lighten(backgroundDefault, 0.03) : darken(backgroundDefault, 0.01);
    const inputBg = isDark ? lighten(backgroundDefault, 0.05) : "#FFFFFF";
    // Tooltips conventionally invert regardless of mode — matches Relay's own choice.
    const tooltipBg = isDark ? lighten(backgroundDefault, 0.15) : "#0F172A";

    const baseShadow = isDark ? "0 2px 12px rgba(0,0,0,0.35)" : "0 2px 10px rgba(0,0,0,0.06)";
    const hoverShadow = isDark ? "0 4px 18px rgba(0,0,0,0.45)" : "0 4px 16px rgba(0,0,0,0.08)";

    const theme = createTheme({
        palette: {
            mode,
            primary: {
                main: BRAND,
                dark: darken(BRAND, 0.18),
                light: lighten(BRAND, 0.2),
                contrastText: palette.primaryContrastText,
            },
            // Secondary + the four semantics are an ecosystem-wide UX convention,
            // not a per-app brand choice — same values in every catalogue app.
            secondary: { main: ECOSYSTEM_COLORS.secondary, contrastText: "#FFFFFF" },
            success: { main: ECOSYSTEM_COLORS.success, contrastText: "#FFFFFF" },
            warning: { main: ECOSYSTEM_COLORS.warning, contrastText: "#111116" },
            error: { main: ECOSYSTEM_COLORS.danger, contrastText: "#FFFFFF" },
            info: { main: ECOSYSTEM_COLORS.info, contrastText: "#FFFFFF" },
            background: { default: backgroundDefault, paper: backgroundPaper },
            text: { primary: textPrimary, secondary: textSecondary },
            divider: dividerColor,
        },

        shape: { borderRadius: 10 },

        typography: {
            fontFamily: appConfig.theme.fontFamily || FALLBACK_FONT_STACK,
            h1: { fontWeight: 800, fontSize: 42, lineHeight: 1.15, color: textPrimary },
            h2: { fontWeight: 800, fontSize: 28, lineHeight: 1.2, color: textPrimary },
            h3: { fontWeight: 700, fontSize: 18, lineHeight: 1.3, color: textPrimary },
            body2: { color: textSecondary },
            caption: { color: textSecondary, letterSpacing: 0.2 },
            overline: { color: textSecondary, letterSpacing: 0.6, textTransform: "none" },
        },

        components: {
            MuiCssBaseline: {
                styleOverrides: (th) => ({
                    "*, *::before, *::after": { boxSizing: "border-box" },
                    body: {
                        backgroundColor: th.palette.background.default,
                        color: th.palette.text.primary,
                        WebkitFontSmoothing: "antialiased",
                        MozOsxFontSmoothing: "grayscale",
                    },
                    "::selection": { background: alpha(BRAND, 0.22) },
                    "*::-webkit-scrollbar": { width: 8, height: 8 },
                    "*::-webkit-scrollbar-thumb": {
                        backgroundColor: isDark ? lighten(backgroundDefault, 0.08) : darken(backgroundDefault, 0.08),
                        borderRadius: 8,
                    },
                }),
            },

            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: appBarBg,
                        borderBottom: `1px solid ${dividerColor}`,
                        boxShadow: "none",
                    },
                },
            },

            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none",
                        border: `1px solid ${dividerColor}`,
                        boxShadow: baseShadow,
                    },
                    outlined: { borderColor: dividerColor },
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        border: `1px solid ${dividerColor}`,
                        backgroundColor: backgroundPaper,
                        boxShadow: baseShadow,
                        transition: "box-shadow .2s ease, border-color .2s ease",
                        borderRadius: 16,
                        "&:hover": {
                            boxShadow: hoverShadow,
                            borderColor: alpha(BRAND, 0.35),
                        },
                    },
                },
            },

            MuiButton: {
                defaultProps: { disableElevation: true },
                styleOverrides: {
                    root: { fontWeight: 800, textTransform: "none" },
                    // The app's main CTA is always styled with the catalogue's own
                    // brand color — kept independent of palette.warning (which is
                    // now the shared ecosystem semantic, not this app's brand).
                    containedWarning: {
                        backgroundColor: BRAND,
                        color: BRAND_CONTRAST_TEXT,
                        borderRadius: 14,
                        border: `1px solid ${BRAND}`,
                        boxShadow: `0 6px 20px ${alpha(BRAND, 0.18)}`,
                        "&:hover": {
                            backgroundColor: BRAND,
                            filter: "brightness(.98)",
                            boxShadow: `0 10px 26px ${alpha(BRAND, 0.24)}`,
                        },
                        "&:active": { transform: "translateY(1px)" },
                    },
                    outlined: {
                        borderColor: dividerColor,
                        background: "transparent",
                        "&:hover": { background: alpha(textPrimary, isDark ? 0.06 : 0.04) },
                    },
                    containedPrimary: {
                        boxShadow: isDark ? "0 8px 26px rgba(0,0,0,.35)" : "0 4px 18px rgba(0,0,0,.08)",
                    },
                    sizeLarge: { height: 48, borderRadius: 14 },
                },
            },

            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        backgroundColor: inputBg,
                        borderRadius: 12,
                        "& fieldset": { borderColor: dividerColor },
                        "&:hover fieldset": { borderColor: dividerColor },
                        "&.Mui-focused fieldset": {
                            borderColor: alpha(BRAND, 0.6),
                            boxShadow: `0 0 0 4px ${alpha(BRAND, 0.12)}`,
                        },
                    },
                    input: {
                        height: 24,
                        padding: "12px 14px",
                        color: textPrimary,
                        "&::placeholder": { color: alpha(textPrimary, isDark ? 0.4 : 0.5) },
                    },
                },
            },
            MuiTextField: { defaultProps: { size: "small" } },
            MuiFormLabel: { styleOverrides: { root: { color: textSecondary } } },
            MuiInputLabel: { styleOverrides: { root: { color: textSecondary } } },
            MuiFormHelperText: { styleOverrides: { root: { color: textSecondary } } },

            MuiMenu: {
                styleOverrides: {
                    paper: { backgroundColor: backgroundPaper, border: `1px solid ${dividerColor}` },
                },
            },
            MuiSelect: { styleOverrides: { icon: { color: textSecondary } } },

            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        "&.Mui-selected": { background: alpha(textPrimary, isDark ? 0.06 : 0.06) },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: { borderRadius: 999 },
                    colorWarning: {
                        background: alpha(ECOSYSTEM_COLORS.warning, 0.12),
                        color: isDark ? lighten(ECOSYSTEM_COLORS.warning, 0.3) : darken(ECOSYSTEM_COLORS.warning, 0.25),
                        borderColor: alpha(ECOSYSTEM_COLORS.warning, 0.35),
                    },
                    colorSuccess: { background: alpha(ECOSYSTEM_COLORS.success, 0.12) },
                    colorError: { background: alpha(ECOSYSTEM_COLORS.danger, 0.12) },
                    colorInfo: { background: alpha(ECOSYSTEM_COLORS.info, 0.12) },
                },
            },

            MuiDivider: { styleOverrides: { root: { borderColor: dividerColor } } },
            MuiTooltip: {
                styleOverrides: {
                    tooltip: { backgroundColor: tooltipBg, color: "#fff" },
                },
            },
            MuiIconButton: { styleOverrides: { root: { color: textPrimary } } },

            MuiTabs: {
                styleOverrides: {
                    root: { minHeight: 44, borderBottom: `1px solid ${dividerColor}` },
                    indicator: { backgroundColor: BRAND, height: 2, borderRadius: 1 },
                    scrollButtons: { "&.Mui-disabled": { opacity: 0.3 } },
                },
            },
            MuiTab: {
                styleOverrides: {
                    root: {
                        minHeight: 44,
                        padding: "6px 12px",
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: 14,
                        color: textSecondary,
                        "&.Mui-selected": { color: textPrimary },
                        "&:hover": {
                            color: textPrimary,
                            backgroundColor: alpha(textPrimary, 0.04),
                        },
                        "@media (max-width:600px)": { padding: "6px 8px", fontSize: 13 },
                    },
                },
            },
            MuiToggleButtonGroup: {
                styleOverrides: {
                    root: { borderRadius: 12, padding: 2, gap: 6 },
                    grouped: { margin: 0, border: "none" },
                },
            },
            MuiToggleButton: {
                styleOverrides: {
                    root: {
                        textTransform: "none",
                        fontWeight: 700,
                        fontSize: 14,
                        borderRadius: 10,
                        padding: "6px 12px",
                        color: textSecondary,
                        backgroundColor: inputBg,
                        border: `1px solid ${dividerColor}`,
                        transition: "all .15s ease",
                        "&:hover": {
                            backgroundColor: alpha(textPrimary, isDark ? 0.06 : 0.04),
                            color: textPrimary,
                        },
                        "&.Mui-selected": {
                            color: BRAND_CONTRAST_TEXT,
                            backgroundColor: BRAND,
                            borderColor: BRAND,
                            boxShadow: `0 6px 20px ${alpha(BRAND, 0.18)}`,
                            "&:hover": {
                                backgroundColor: BRAND,
                                filter: "brightness(.98)",
                                boxShadow: `0 10px 26px ${alpha(BRAND, 0.24)}`,
                            },
                        },
                        "@media (max-width:600px)": { padding: "6px 10px", fontSize: 13 },
                    },
                },
            },
        },
    });

    return theme;
};
