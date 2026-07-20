import { create } from 'zustand';

export type SnackType = 'success' | 'error' | 'warning' | 'info';

export interface SnackMessage {
  id: string;
  type: SnackType;
  message: string;
}

interface UIState {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;

  snackQueue: SnackMessage[];
  pushSnack: (msg: Omit<SnackMessage, 'id'>) => void;
  dismissSnack: (id: string) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

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
