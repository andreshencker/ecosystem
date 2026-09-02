import type { NavigationConfig } from "../types";

export const publicNavigation: NavigationConfig = {
    role: "public",
    brand: { to: "/" },

    layout: {
        hasNavbar: true,
        hasSidebar: false,
        hasPopover: false,
    },

    navbar: [
        { type: "link", label: "Home", path: "/" },
        { type: "link", label: "Marketplace", path: "/marketplace" },
        { type: "link", label: "Developers", path: "/developers" },
        { type: "link", label: "How it works", path: "/how-it-works" },
        { type: "link", label: "Platforms", path: "/platforms" },
        { type: "link", label: "Sign in", path: "/signin" },
        // 🔒 Sign Up oculto por ahora
        // { type: "link", label: "Sign Up", path: "/signup" },
    ],

    sidebar: { sections: {} },
    general: [],
    popover: { items: [] },
};
