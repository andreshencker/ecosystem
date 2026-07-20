// src/app/common/theme/makeTheme.ts
import {alpha, createTheme, PaletteMode} from "@mui/material";
import type {BrandTokens} from "./tokens";

export const makeTheme = (mode: PaletteMode, t: BrandTokens) => {
    // ===== Base por modo =====
    const isDark = mode === "dark";

    // Paleta base desde tus tokens
    const backgroundDefault = t.bg;
    const backgroundPaper = t.panel;
    const textPrimary = isDark ? (t.text ?? "#ffffff") : (t.text ?? "#111214");
    const textSecondary = isDark ? (t.textMuted ?? "#a7a7b3") : (t.textMuted ?? "#5f6770");
    const dividerColor = t.divider ?? (isDark ? "#24243a" : alpha("#111", 0.12));

    // Amarillo de marca (idéntico a tu CSS)
    const YELLOW = "#ffd400";

    // Superficies para inputs
    const inputBgDark = "#141422";            // fondo input en dark
    const inputBrDark = "#23233a";            // borde input en dark
    const inputBgLight = "#fff7bf";            // “cream” claro
    const inputBrLight = "#e8df9e";            // borde suave en light

    // Sombras
    const baseShadow = isDark ? "0 2px 12px rgba(0,0,0,0.35)" : "0 2px 10px rgba(0,0,0,0.06)";
    const hoverShadow = isDark ? "0 4px 18px rgba(0,0,0,0.45)" : "0 4px 16px rgba(0,0,0,0.08)";

    const theme = createTheme({
        palette: {
            mode,
            primary: {main: t.primary, contrastText: isDark ? "#fff" : "#111214"},
            // ⚠️ Amarillo consistente con tu UI
            warning: {main: YELLOW, contrastText: "#111214"},
            success: {main: t.success},
            error: {main: t.danger},
            info: {main: t.info},
            background: {default: backgroundDefault, paper: backgroundPaper},
            text: {primary: textPrimary, secondary: textSecondary},
            divider: dividerColor,
        },

        // Radios por defecto (componentes ajustan lo suyo)
        shape: {borderRadius: 10},

        typography: {
            fontFamily: [
                "Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto",
                "Helvetica Neue", "Arial", "Noto Sans",
                "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji",
                "sans-serif",
            ].join(","),
            h1: {fontWeight: 800, fontSize: 42, lineHeight: 1.15, color: t.textStrong},
            h2: {fontWeight: 800, fontSize: 28, lineHeight: 1.2, color: t.textStrong},
            h3: {fontWeight: 700, fontSize: 18, lineHeight: 1.3, color: t.textStrong},
            body2: {color: textSecondary},
            caption: {color: textSecondary, letterSpacing: 0.2},
            overline: {color: textSecondary, letterSpacing: 0.6, textTransform: "none"},
        },

        components: {
            // ===== Global / baseline =====
            MuiCssBaseline: {
                styleOverrides: (th) => ({
                    "*, *::before, *::after": {boxSizing: "border-box"},
                    body: {
                        backgroundColor: th.palette.background.default,
                        color: th.palette.text.primary,
                        WebkitFontSmoothing: "antialiased",
                        MozOsxFontSmoothing: "grayscale",
                    },
                    "::selection": {
                        background: alpha(YELLOW, 0.25),
                    },
                    "*::-webkit-scrollbar": {width: 8, height: 8},
                    "*::-webkit-scrollbar-thumb": {
                        backgroundColor: isDark ? "#2b2b36" : "#cfd3da",
                        borderRadius: 8,
                    },
                }),
            },

            // ===== AppBar como panel =====
            MuiAppBar: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? "#111214" : "#f8f9fb",
                        borderBottom: `1px solid ${dividerColor}`,
                        boxShadow: "none",
                    },
                },
            },

            // ===== Paper / Cards =====
            MuiPaper: {
                styleOverrides: {
                    root: {
                        backgroundImage: "none",
                        border: `1px solid ${dividerColor}`,
                        boxShadow: baseShadow,
                    },
                    outlined: {borderColor: dividerColor},
                },
            },
            MuiCard: {
                styleOverrides: {
                    root: {
                        border: `1px solid ${dividerColor}`,
                        backgroundColor: backgroundPaper,
                        boxShadow: baseShadow,
                        transition: "box-shadow .2s ease, border-color .2s ease",
                        borderRadius: 16, // panel estándar
                        "&:hover": {
                            boxShadow: hoverShadow,
                            borderColor: alpha(YELLOW, 0.35),
                        },
                    },
                },
            },

            // ===== Botones =====
            MuiButton: {
                defaultProps: {disableElevation: true},
                styleOverrides: {
                    root: {
                        fontWeight: 800,
                        textTransform: "none",
                    },
                    // Botón de acción amarillo (como login)
                    containedWarning: {
                        backgroundColor: YELLOW,
                        color: "#111214",
                        borderRadius: 14,
                        border: `1px solid ${YELLOW}`,
                        boxShadow: `0 6px 20px ${alpha(YELLOW, 0.18)}`,
                        "&:hover": {
                            backgroundColor: YELLOW,
                            filter: "brightness(.98)",
                            boxShadow: `0 10px 26px ${alpha(YELLOW, 0.24)}`,
                        },
                        "&:active": {transform: "translateY(1px)"},
                    },
                    // Outlined/ghost como tu guía
                    outlined: {
                        borderColor: isDark ? "#2a2a35" : alpha("#111", 0.2),
                        background: "transparent",
                        "&:hover": {background: isDark ? "#1b1b25" : alpha("#111", 0.04)},
                    },
                    containedPrimary: {
                        boxShadow: isDark ? "0 8px 26px rgba(0,0,0,.35)" : "0 4px 18px rgba(0,0,0,.08)",
                    },
                    sizeLarge: {height: 48, borderRadius: 14},
                },
            },

            // ===== Inputs sólidos (sin underline) =====
            MuiOutlinedInput: {
                styleOverrides: {
                    root: {
                        backgroundColor: isDark ? inputBgDark : inputBgLight,
                        borderRadius: 12,
                        // borde base
                        "& fieldset": {
                            borderColor: isDark ? inputBrDark : inputBrLight,
                        },
                        // hover
                        "&:hover fieldset": {
                            borderColor: isDark ? inputBrDark : inputBrLight,
                        },
                        // focus ring amarillo
                        "&.Mui-focused fieldset": {
                            borderColor: alpha(YELLOW, 0.6),
                            boxShadow: `0 0 0 4px ${alpha(YELLOW, 0.15)}`,
                        },
                    },
                    input: {
                        height: 24,
                        padding: "12px 14px",
                        color: textPrimary,
                        "&::placeholder": {color: isDark ? "#ffffff66" : alpha("#111", 0.5)},
                    },
                },
            },
            MuiTextField: {defaultProps: {size: "small"}},
            MuiFormLabel: {styleOverrides: {root: {color: textSecondary}}},
            MuiInputLabel: {styleOverrides: {root: {color: textSecondary}}},
            MuiFormHelperText: {styleOverrides: {root: {color: textSecondary}}},

            // ===== Menús / Select =====
            MuiMenu: {
                styleOverrides: {
                    paper: {
                        backgroundColor: backgroundPaper,
                        border: `1px solid ${dividerColor}`,
                    },
                },
            },
            MuiSelect: {
                styleOverrides: {icon: {color: textSecondary}},
            },

            // ===== List / Chips =====
            MuiListItemButton: {
                styleOverrides: {
                    root: {
                        borderRadius: 8,
                        "&.Mui-selected": {
                            background: isDark ? "rgba(255,255,255,0.06)" : "rgba(17,17,17,0.06)",
                        },
                    },
                },
            },
            MuiChip: {
                styleOverrides: {
                    root: {borderRadius: 999},
                    colorWarning: {
                        background: "rgba(255,212,0,0.12)",
                        color: isDark ? "#fffb" : "#6b5d00",
                        borderColor: alpha(YELLOW, 0.35),
                    },
                    colorSuccess: {background: "rgba(34,197,94,0.12)"},
                    colorError: {background: "rgba(240,61,61,0.12)"},
                    colorInfo: {background: "rgba(96,165,250,0.12)"},
                },
            },

            // ===== Divider / Tooltip / IconButton =====
            MuiDivider: {styleOverrides: {root: {borderColor: dividerColor}}},
            MuiTooltip: {
                styleOverrides: {
                    tooltip: {
                        backgroundColor: isDark ? "#1f1f28" : "#1f2937",
                        color: "#fff",
                    },
                },
            },
            MuiIconButton: {styleOverrides: {root: {color: textPrimary}}},
        },
        MuiTabs: {
            styleOverrides: {
                root: {
                    minHeight: 44,
                    borderBottom: `1px solid ${dividerColor}`, // línea inferior
                },
                indicator: {
                    backgroundColor: YELLOW, // subrayado amarillo
                    height: 2,
                    borderRadius: 1,
                },
                scrollButtons: {
                    "&.Mui-disabled": {opacity: 0.3},
                },
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
                    "&.Mui-selected": {
                        color: textPrimary,
                    },
                    "&:hover": {
                        color: textPrimary,
                        backgroundColor: isDark
                            ? "rgba(255,255,255,0.04)"
                            : "rgba(17,17,17,0.04)",
                    },
                    "@media (max-width:600px)": {
                        padding: "6px 8px",
                        fontSize: 13,
                    },
                },
            },
        },
        MuiToggleButtonGroup: {
            styleOverrides: {
                root: {
                    borderRadius: 12,
                    padding: 2,
                    gap: 6, // separaciones sutiles entre píldoras
                },
                grouped: {
                    margin: 0,
                    border: "none",
                },
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
                    backgroundColor: isDark ? "#141422" : "#ffffff",
                    border: `1px solid ${isDark ? "#23233a" : "#e5e7eb"}`,
                    transition: "all .15s ease",
                    "&:hover": {
                        backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(17,17,17,0.04)",
                        color: textPrimary,
                    },
                    "&.Mui-selected": {
                        color: "#111214",
                        backgroundColor: YELLOW,
                        borderColor: YELLOW,
                        boxShadow: `0 6px 20px ${alpha(YELLOW, 0.18)}`,
                        "&:hover": {
                            backgroundColor: YELLOW,
                            filter: "brightness(.98)",
                            boxShadow: `0 10px 26px ${alpha(YELLOW, 0.24)}`,
                        },
                    },
                    "@media (max-width:600px)": {
                        padding: "6px 10px",
                        fontSize: 13,
                    },
                },
            },
        },
    });

    return theme;
};