// src/app/common/theme/tokens.ts
//
// Ecosystem-wide convention, NOT app branding — these five colors are the
// same across every catalogue app (Relay, jtrade, ...). Brand identity
// (primary/background/text) comes exclusively from the Grapifly Applications
// catalogue; see makeTheme.ts. Values match relay/frontend/theme/mui-theme.ts.
export const ECOSYSTEM_COLORS = {
    secondary: "#7655E8",
    success: "#0EA66F",
    warning: "#D97706",
    danger: "#DC2626",
    info: "#2563EB",
} as const;
