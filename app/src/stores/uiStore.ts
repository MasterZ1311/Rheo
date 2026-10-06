import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type Theme = 'light' | 'dark' | 'system';

function resolveTheme(theme: Theme): 'light' | 'dark' {
  if (theme !== 'system') return theme;
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', resolveTheme(theme) === 'dark');
}

// Draft state for the create voice profile form
export interface ProfileFormDraft {
  name: string;
  description: string;
  language: string;
  personality: string;
  referenceText: string;
  sampleMode: 'upload' | 'record' | 'system';
  // Note: File objects can't be persisted, so we store metadata
  sampleFileName?: string;
  sampleFileType?: string;
  sampleFileData?: string; // Base64 encoded
}

interface UIStore {
  // Sidebar
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // Modals
  profileDialogOpen: boolean;
  setProfileDialogOpen: (open: boolean) => void;
  editingProfileId: string | null;
  setEditingProfileId: (id: string | null) => void;

  generationDialogOpen: boolean;
  setGenerationDialogOpen: (open: boolean) => void;

  // Selected profile for generation
  selectedProfileId: string | null;
  setSelectedProfileId: (id: string | null) => void;

  // Currently selected engine (synced from generation form)
  selectedEngine: string;
  setSelectedEngine: (engine: string) => void;

  // Selected voice in Voices tab inspector
  selectedVoiceId: string | null;
  setSelectedVoiceId: (id: string | null) => void;

  // Profile form draft (for persisting create voice modal state)
  profileFormDraft: ProfileFormDraft | null;
  setProfileFormDraft: (draft: ProfileFormDraft | null) => void;

  // User Name Onboarding
  userName: string | null;
  setUserName: (name: string | null) => void;
  userNameModalOpen: boolean;
  setUserNameModalOpen: (open: boolean) => void;

  // Dashboard Tasks
  dashboardTasks: DashboardTask[];
  setDashboardTasks: (tasks: DashboardTask[]) => void;
  toggleDashboardTask: (id: string) => void;
  addDashboardTask: (task: Omit<DashboardTask, 'id'>) => void;
  deleteDashboardTask: (id: string) => void;

  // Onboarding Tour
  tourOpen: boolean;
  setTourOpen: (open: boolean) => void;
  tourCompleted: boolean;
  setTourCompleted: (completed: boolean) => void;

  // Theme
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

export interface DashboardTask {
  id: string;
  title: string;
  tag: string;
  completed: boolean;
  createdAt?: number;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      profileDialogOpen: false,
      setProfileDialogOpen: (open) => set({ profileDialogOpen: open }),
      editingProfileId: null,
      setEditingProfileId: (id) => set({ editingProfileId: id }),

      generationDialogOpen: false,
      setGenerationDialogOpen: (open) => set({ generationDialogOpen: open }),

      selectedProfileId: null,
      setSelectedProfileId: (id) => set({ selectedProfileId: id }),

      selectedEngine: 'qwen',
      setSelectedEngine: (engine) => set({ selectedEngine: engine }),

      selectedVoiceId: null,
      setSelectedVoiceId: (id) => set({ selectedVoiceId: id }),

      profileFormDraft: null,
      setProfileFormDraft: (draft) => set({ profileFormDraft: draft }),

      userName: null,
      setUserName: (name) => set({ userName: name }),
      userNameModalOpen: false,
      setUserNameModalOpen: (open) => set({ userNameModalOpen: open }),

      dashboardTasks: [
        { id: '1', title: 'Calibrate neural voice clone', tag: 'Today', completed: false },
        { id: '2', title: 'Generate keynote audio brief', tag: 'Today', completed: false },
        { id: '3', title: 'Synchronize voice stream harmonics', tag: 'Today', completed: true },
      ],
      setDashboardTasks: (tasks) => set({ dashboardTasks: tasks }),
      toggleDashboardTask: (id) =>
        set((state) => ({
          dashboardTasks: state.dashboardTasks.map((t) =>
            t.id === id ? { ...t, completed: !t.completed } : t,
          ),
        })),
      addDashboardTask: (task) =>
        set((state) => ({
          dashboardTasks: [
            ...state.dashboardTasks,
            { ...task, id: Math.random().toString(36).substring(2, 9), createdAt: Date.now() },
          ],
        })),
      deleteDashboardTask: (id) =>
        set((state) => ({
          dashboardTasks: state.dashboardTasks.filter((t) => t.id !== id),
        })),

      tourOpen: false,
      setTourOpen: (open) => set({ tourOpen: open }),
      tourCompleted: false,
      setTourCompleted: (completed) => set({ tourCompleted: completed }),

      theme: 'system',
      setTheme: (theme) => {
        set({ theme });
        applyTheme(theme);
      },
    }),
    {
      name: 'rheo-ui',
      partialize: (state) => ({
        selectedProfileId: state.selectedProfileId,
        theme: state.theme,
        tourCompleted: state.tourCompleted,
        userName: state.userName,
        dashboardTasks: state.dashboardTasks,
      }),
      onRehydrateStorage: () => (state) => {
        if (state) applyTheme(state.theme);
      },
    },
  ),
);
