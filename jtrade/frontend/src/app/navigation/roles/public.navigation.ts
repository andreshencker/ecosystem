import type { NavigationConfig } from "../types";

export const publicNavigation: NavigationConfig = {
    role: "public",
    brand: { name: "JTrade", to: "/" },

    layout: {
        hasNavbar: true,
        hasSidebar: false,
        hasPopover: false,
    },

    navbar: [
        { type: "link", label: "Home", path: "/" },
        { type: "link", label: "Sign In", path: "/signin" },
        // 🔒 Sign Up oculto por ahora
        // { type: "link", label: "Sign Up", path: "/signup" },
    ],

    sidebar: { sections: {} },
    general: [],
    popover: { items: [] },
};