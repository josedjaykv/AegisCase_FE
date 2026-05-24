import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type Density = 'comfortable' | 'compact';

interface UiState {
  theme: Theme;
  density: Density;
  sidebarOpen: boolean;
  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      density: 'comfortable',
      sidebarOpen: true,
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
    }),
    {
      name: 'aegiscase:ui',
      partialize: (s) => ({ theme: s.theme, density: s.density }),
    },
  ),
);
