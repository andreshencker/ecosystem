import { create } from "zustand";

interface UIState {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;

    sidebarCollapsed: boolean;
    setSidebarCollapsed: (collapsed: boolean) => void;

    toggleSidebar: (isDesktop: boolean) => void;

    activeCategoryKey: string | null;
    setActiveCategoryKey: (key: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
    sidebarOpen: false,
    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    sidebarCollapsed: false,
    setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),

    toggleSidebar: (isDesktop) =>
        set((state) =>
            isDesktop
                ? { sidebarCollapsed: !state.sidebarCollapsed }
                : { sidebarOpen: !state.sidebarOpen },
        ),

    activeCategoryKey: null,
    setActiveCategoryKey: (key) => set({ activeCategoryKey: key }),
}));
