// src/app/common/theme/tokens.ts
export type BrandTokens = {
    primary: string;
    bg: string;
    panel: string;
    surface: string;
    surface2: string;
    text: string;
    textStrong: string;
    textMuted: string;
    divider: string;
    ring: string;
    success: string;
    warning: string;
    danger: string;
    info: string;
};

export const DARK: BrandTokens = {
    primary: "#F0B90B",
    bg: "#0b0b0f",
    panel: "#0f0f16",
    surface: "#121316",
    surface2: "#0b0b0f",
    text: "#ffffff",
    textStrong: "#ffffff",
    textMuted: "#A7A7B3",
    divider: "rgba(255,255,255,0.08)",
    ring: "#2a2c36",
    success: "#22c55e",
    warning: "#f59e0b",
    danger: "#f03d3d",
    info: "#60a5fa",
};

export const LIGHT: BrandTokens = {
    primary: "#F0B90B",
    bg: "#f8f9fb",
    panel: "#ffffff",
    surface: "#f4f6f8",
    surface2: "#ffffff",
    text: "#111214",
    textStrong: "#0b1220",
    textMuted: "#4b5563",
    divider: "#e5e7eb",
    ring: "#d1d5db",
    success: "#16a34a",
    warning: "#d97706",
    danger: "#dc2626",
    info: "#2563eb",
};