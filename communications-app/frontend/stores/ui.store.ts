import { create } from 'zustand';

export type SnackType = 'success' | 'error' | 'warning' | 'info';

export interface SnackMessage {
  id: string;
  type: SnackType;
  message: string;
  /** Optional duration override in ms. If omitted, GlobalSnackbar uses the type-based default. */
  duration?: number;
}

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  // Which channel tab (Setup / Calendar / Payments / …) is active in the
  // navbar. Shared between Topbar (renders the tabs) and Sidebar (renders
  // the active tab's pages) — they're siblings, not parent/child.
  activeChannelTab: string;
  setActiveChannelTab: (key: string) => void;

  snackQueue: SnackMessage[];
  pushSnack: (msg: Omit<SnackMessage, 'id'>) => void;
  dismissSnack: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  activeChannelTab: '',
  setActiveChannelTab: (key) => set({ activeChannelTab: key }),

  snackQueue: [],

  pushSnack: (msg) =>
    set((s) => ({
      snackQueue: [
        // cap at 3 simultaneous — drop oldest
        ...s.snackQueue.slice(-2),
        { ...msg, id: `${Date.now()}-${Math.random()}` },
      ],
    })),

  dismissSnack: (id) =>
    set((s) => ({
      snackQueue: s.snackQueue.filter((m) => m.id !== id),
    })),
}));
