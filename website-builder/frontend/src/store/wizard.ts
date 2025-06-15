import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

// Simple wizard data interface
export interface SimpleWizardData {
  // Project Basics
  name?: string
  description?: string
  websiteType?: string
  domain?: string
  keywords?: string

  // Design Preferences
  colorScheme?: string
  designStyle?: string
  customColors?: {
    primary: string
    secondary: string
    accent: string
  }

  // Features Selection
  selectedFeatures?: string[]
  integrations?: string[]

  // Content Details
  companyName?: string
  tagline?: string
  aboutUs?: string
  services?: string[]
  contactInfo?: {
    email: string
    phone?: string
    address?: string
    socialMedia?: {
      facebook?: string
      twitter?: string
      linkedin?: string
      instagram?: string
    }
  }
}

// Wizard store interface
interface WizardStore {
  // State
  currentStep: number
  totalSteps: number
  data: SimpleWizardData
  isComplete: boolean
  errors: Record<string, string>
  isLoading: boolean

  // Actions
  setCurrentStep: (step: number) => void
  updateData: (stepData: Partial<SimpleWizardData>) => void
  nextStep: () => void
  previousStep: () => void
  resetWizard: () => void
  validateStep: (step: number) => boolean
  setError: (field: string, error: string) => void
  clearError: (field: string) => void
  setLoading: (loading: boolean) => void
}

// Simple validation helper
const validateWizardStep = (step: number, data: SimpleWizardData) => {
  switch (step) {
    case 1: // Project Basics
      return !!(data.name && data.websiteType)
    case 2: // Design Preferences
      return !!(data.colorScheme && data.designStyle)
    case 3: // Features Selection
      return !!(data.selectedFeatures && data.selectedFeatures.length > 0)
    case 4: // Content Details
      return !!(data.companyName && data.aboutUs && data.contactInfo?.email)
    default:
      return true
  }
}

export const useWizardStore = create<WizardStore>()(
  persist(
    (set, get) => ({
      // State
      currentStep: 1,
      totalSteps: 6,
      data: {},
      isComplete: false,
      errors: {},
      isLoading: false,

      // Actions
      setCurrentStep: (step: number) => {
        const { totalSteps } = get()
        if (step >= 1 && step <= totalSteps) {
          set({ currentStep: step })
        }
      },

      updateData: (stepData: Partial<SimpleWizardData>) => {
        set((state) => ({
          data: { ...state.data, ...stepData },
          errors: {}, // Clear errors when updating data
        }))
      },

      nextStep: () => {
        const { currentStep, totalSteps } = get()
        if (currentStep < totalSteps) {
          set({ currentStep: currentStep + 1 })
        }
      },

      previousStep: () => {
        const { currentStep } = get()
        if (currentStep > 1) {
          set({ currentStep: currentStep - 1 })
        }
      },

      resetWizard: () => {
        set({
          currentStep: 1,
          data: {},
          isComplete: false,
          errors: {},
          isLoading: false,
        })
      },

      validateStep: (step: number) => {
        const { data } = get()
        const isValid = validateWizardStep(step, data)
        
        if (!isValid) {
          set((state) => ({
            errors: { ...state.errors, [step]: 'Please complete all required fields' }
          }))
          return false
        }
        
        // Clear error for this step
        set((state) => {
          const newErrors = { ...state.errors }
          delete newErrors[step]
          return { errors: newErrors }
        })
        
        return true
      },

      setError: (field: string, error: string) => {
        set((state) => ({
          errors: { ...state.errors, [field]: error }
        }))
      },

      clearError: (field: string) => {
        set((state) => {
          const newErrors = { ...state.errors }
          delete newErrors[field]
          return { errors: newErrors }
        })
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading })
      }
    }),
    {
      name: 'wizard-store',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({        
        currentStep: state.currentStep,
        data: state.data,
        isComplete: state.isComplete,
      }),
    }
  )
)
