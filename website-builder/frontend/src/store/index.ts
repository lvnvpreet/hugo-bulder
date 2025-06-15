import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User, Project, ProjectStatus } from '../types'

// Auth Store
interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
}

interface AuthActions {
  login: (user: User, token: string) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Actions
      login: (user: User, token: string) => {
        localStorage.setItem('authToken', token)
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        })
      },

      logout: () => {
        localStorage.removeItem('authToken')
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        })
      },

      updateUser: (userData: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }))
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      },
    }),
    {
      name: 'auth-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)

// Projects Store
interface ProjectsState {
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

interface ProjectsActions {
  setProjects: (projects: Project[]) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  deleteProject: (id: string) => void
  setCurrentProject: (project: Project | null) => void
  setLoading: (loading: boolean) => void
  setError: (error: string | null) => void
  setPagination: (pagination: Partial<ProjectsState['pagination']>) => void
  getProjectById: (id: string) => Project | undefined
  getProjectsByStatus: (status: ProjectStatus) => Project[]
}

export const useProjectsStore = create<ProjectsState & ProjectsActions>()(
  (set, get) => ({
    // State
    projects: [],
    currentProject: null,
    isLoading: false,
    error: null,
    pagination: {
      page: 1,
      pageSize: 10,
      total: 0,
      totalPages: 0,
    },

    // Actions
    setProjects: (projects: Project[]) => {
      set({ projects, error: null })
    },

    addProject: (project: Project) => {
      set((state) => ({
        projects: [project, ...state.projects],
        error: null,
      }))
    },

    updateProject: (id: string, updates: Partial<Project>) => {
      set((state) => ({
        projects: state.projects.map((p) =>
          p.id === id ? { ...p, ...updates } : p
        ),
        currentProject:
          state.currentProject?.id === id
            ? { ...state.currentProject, ...updates }
            : state.currentProject,
        error: null,
      }))
    },

    deleteProject: (id: string) => {
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject:
          state.currentProject?.id === id ? null : state.currentProject,
        error: null,
      }))
    },

    setCurrentProject: (project: Project | null) => {
      set({ currentProject: project })
    },

    setLoading: (loading: boolean) => {
      set({ isLoading: loading })
    },

    setError: (error: string | null) => {
      set({ error })
    },

    setPagination: (pagination: Partial<ProjectsState['pagination']>) => {
      set((state) => ({
        pagination: { ...state.pagination, ...pagination },
      }))
    },

    getProjectById: (id: string) => {
      return get().projects.find((p) => p.id === id)
    },

    getProjectsByStatus: (status: ProjectStatus) => {
      return get().projects.filter((p) => p.status === status)
    },
  })
)

// UI Store for global UI state
interface UIState {
  sidebarOpen: boolean
  theme: 'light' | 'dark' | 'system'
  notifications: Notification[]
  modals: {
    [key: string]: boolean
  }
}

interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number
  actions?: NotificationAction[]
}

interface NotificationAction {
  label: string
  onClick: () => void
  variant?: 'default' | 'destructive'
}

interface UIActions {
  toggleSidebar: () => void
  setSidebarOpen: (open: boolean) => void
  setTheme: (theme: UIState['theme']) => void
  addNotification: (notification: Omit<Notification, 'id'>) => void
  removeNotification: (id: string) => void
  clearNotifications: () => void
  openModal: (modalId: string) => void
  closeModal: (modalId: string) => void
  toggleModal: (modalId: string) => void
}

export const useUIStore = create<UIState & UIActions>()(
  persist(
    (set, get) => ({
      // State
      sidebarOpen: true,
      theme: 'system',
      notifications: [],
      modals: {},

      // Actions
      toggleSidebar: () => {
        set((state) => ({ sidebarOpen: !state.sidebarOpen }))
      },

      setSidebarOpen: (open: boolean) => {
        set({ sidebarOpen: open })
      },

      setTheme: (theme: UIState['theme']) => {
        set({ theme })
        
        // Apply theme to document
        const root = document.documentElement
        if (theme === 'dark') {
          root.classList.add('dark')
        } else if (theme === 'light') {
          root.classList.remove('dark')
        } else {
          // System theme
          const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
          if (isDark) {
            root.classList.add('dark')
          } else {
            root.classList.remove('dark')
          }
        }
      },

      addNotification: (notification: Omit<Notification, 'id'>) => {
        const id = Math.random().toString(36).substr(2, 9)
        const newNotification = { ...notification, id }
        
        set((state) => ({
          notifications: [...state.notifications, newNotification],
        }))

        // Auto-remove notification after duration
        if (notification.duration !== 0) {
          setTimeout(() => {
            get().removeNotification(id)
          }, notification.duration || 5000)
        }
      },

      removeNotification: (id: string) => {
        set((state) => ({
          notifications: state.notifications.filter((n) => n.id !== id),
        }))
      },

      clearNotifications: () => {
        set({ notifications: [] })
      },

      openModal: (modalId: string) => {
        set((state) => ({
          modals: { ...state.modals, [modalId]: true },
        }))
      },

      closeModal: (modalId: string) => {
        set((state) => ({
          modals: { ...state.modals, [modalId]: false },
        }))
      },

      toggleModal: (modalId: string) => {
        set((state) => ({
          modals: { ...state.modals, [modalId]: !state.modals[modalId] },
        }))
      },
    }),
    {
      name: 'ui-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        sidebarOpen: state.sidebarOpen,
        theme: state.theme,
      }),
    }
  )
)

// Generation Store for tracking AI generation status
interface GenerationState {
  activeGenerations: Map<string, GenerationStatus>
  history: GenerationHistory[]
}

interface GenerationStatus {
  id: string
  projectId: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  progress: number
  currentStep: string
  startTime: Date
  endTime?: Date
  error?: string
  result?: any
}

interface GenerationHistory {
  id: string
  projectId: string
  status: GenerationStatus['status']
  startTime: Date
  endTime?: Date
  duration?: number
  error?: string
}

interface GenerationActions {
  startGeneration: (projectId: string, generationId: string) => void
  updateGeneration: (generationId: string, updates: Partial<GenerationStatus>) => void
  completeGeneration: (generationId: string, result?: any) => void
  failGeneration: (generationId: string, error: string) => void
  getGenerationStatus: (generationId: string) => GenerationStatus | undefined
  getProjectGenerations: (projectId: string) => GenerationStatus[]
  clearHistory: () => void
}

export const useGenerationStore = create<GenerationState & GenerationActions>()(
  (set, get) => ({
    // State
    activeGenerations: new Map(),
    history: [],

    // Actions
    startGeneration: (projectId: string, generationId: string) => {
      const generation: GenerationStatus = {
        id: generationId,
        projectId,
        status: 'pending',
        progress: 0,
        currentStep: 'Initializing...',
        startTime: new Date(),
      }

      set((state) => ({
        activeGenerations: new Map(state.activeGenerations).set(generationId, generation),
      }))
    },

    updateGeneration: (generationId: string, updates: Partial<GenerationStatus>) => {
      set((state) => {
        const activeGenerations = new Map(state.activeGenerations)
        const current = activeGenerations.get(generationId)
        
        if (current) {
          activeGenerations.set(generationId, { ...current, ...updates })
        }
        
        return { activeGenerations }
      })
    },

    completeGeneration: (generationId: string, result?: any) => {
      const generation = get().activeGenerations.get(generationId)
      
      if (generation) {
        const endTime = new Date()
        const duration = endTime.getTime() - generation.startTime.getTime()
        
        // Update active generation
        set((state) => {
          const activeGenerations = new Map(state.activeGenerations)
          activeGenerations.set(generationId, {
            ...generation,
            status: 'completed',
            progress: 100,
            currentStep: 'Completed',
            endTime,
            result,
          })
          
          return { activeGenerations }
        })
        
        // Add to history
        const historyItem: GenerationHistory = {
          id: generationId,
          projectId: generation.projectId,
          status: 'completed',
          startTime: generation.startTime,
          endTime,
          duration,
        }
        
        set((state) => ({
          history: [historyItem, ...state.history.slice(0, 49)], // Keep last 50 items
        }))
      }
    },

    failGeneration: (generationId: string, error: string) => {
      const generation = get().activeGenerations.get(generationId)
      
      if (generation) {
        const endTime = new Date()
        const duration = endTime.getTime() - generation.startTime.getTime()
        
        // Update active generation
        set((state) => {
          const activeGenerations = new Map(state.activeGenerations)
          activeGenerations.set(generationId, {
            ...generation,
            status: 'failed',
            currentStep: 'Failed',
            endTime,
            error,
          })
          
          return { activeGenerations }
        })
        
        // Add to history
        const historyItem: GenerationHistory = {
          id: generationId,
          projectId: generation.projectId,
          status: 'failed',
          startTime: generation.startTime,
          endTime,
          duration,
          error,
        }
        
        set((state) => ({
          history: [historyItem, ...state.history.slice(0, 49)],
        }))
      }
    },

    getGenerationStatus: (generationId: string) => {
      return get().activeGenerations.get(generationId)
    },

    getProjectGenerations: (projectId: string) => {
      const { activeGenerations } = get()
      return Array.from(activeGenerations.values()).filter(
        (gen) => gen.projectId === projectId
      )
    },

    clearHistory: () => {
      set({ history: [] })
    },  })
)

// Store exports
export { useWizardStore } from './wizardStore';
export { useWizardStore as useSimpleWizardStore } from './wizard'; // Legacy compatibility
