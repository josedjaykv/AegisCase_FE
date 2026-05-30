import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';
export type Density = 'comfortable' | 'compact';
export type TaskView = 'kanban' | 'list';

interface UiState {
  theme: Theme;
  density: Density;
  sidebarOpen: boolean;
  taskView: TaskView;
  setTheme: (theme: Theme) => void;
  setDensity: (density: Density) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setTaskView: (view: TaskView) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: 'system',
      density: 'comfortable',
      sidebarOpen: true,
      taskView: 'kanban',
      setTheme: (theme) => set({ theme }),
      setDensity: (density) => set({ density }),
      setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      setTaskView: (taskView) => set({ taskView }),
    }),
    {
      name: 'aegiscase:ui',
      partialize: (s) => ({
        theme: s.theme,
        density: s.density,
        taskView: s.taskView,
        sidebarOpen: s.sidebarOpen,
      }),
    },
  ),
);
