import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';
import type { WizardData, WizardStore, StepCompletion, ValidationResult } from '../types/wizard';

// Initial data structure
const initialWizardData: WizardData = {
  websiteType: null,
  businessCategory: null,
  businessInfo: null,
  websitePurpose: null,
  businessDescription: null,
  servicesSelection: null,
  locationInfo: null,
  websiteStructure: null,
  themeConfig: null,
  additionalRequirements: null,
};

// Initial step completion tracking
const initialStepCompletion: StepCompletion = {
  1: { isCompleted: false, isValid: false },
  2: { isCompleted: false, isValid: false },
  3: { isCompleted: false, isValid: false },
  4: { isCompleted: false, isValid: false },
  5: { isCompleted: false, isValid: false },
  6: { isCompleted: false, isValid: false },
  7: { isCompleted: false, isValid: false },
  8: { isCompleted: false, isValid: false },
  9: { isCompleted: false, isValid: false },
  10: { isCompleted: false, isValid: false },
};

// Validation functions for each step
const validateStepData = (step: number, data: WizardData): ValidationResult => {
  const errors: string[] = [];

  switch (step) {
    case 1:
      if (!data.websiteType) {
        errors.push('Please select a website type');
      }
      break;
    
    case 2:
      // Only validate if business or ecommerce type
      if (data.websiteType?.id === 'business' || data.websiteType?.id === 'ecommerce') {
        if (!data.businessCategory) {
          errors.push('Please select a business category');
        }
      }
      break;
    
    case 3:
      if (data.websiteType?.id === 'business' || data.websiteType?.id === 'ecommerce') {
        if (!data.businessInfo?.name) {
          errors.push('Business name is required');
        }
        if (!data.businessInfo?.description) {
          errors.push('Business description is required');
        }
      } else {
        // Personal/blog/portfolio validation
        if (!data.businessInfo?.name) {
          errors.push('Name is required');
        }
      }
      break;
    
    case 4:
      if (!data.websitePurpose?.primary) {
        errors.push('Please select a primary website purpose');
      }
      if (!data.websitePurpose?.goals || data.websitePurpose.goals.length === 0) {
        errors.push('Please select at least one goal');
      }      break;
    
    case 5:
      if (!data.businessDescription?.description) {
        errors.push('Business description is required');
      }
      if (data.businessDescription?.description && data.businessDescription.description.length < 50) {
        errors.push('Business description should be at least 50 characters');
      }
      break;
    
    case 6:
      const totalServices = (data.servicesSelection?.selectedServices?.length || 0) + 
                           (data.servicesSelection?.customServices?.length || 0);
      if (totalServices === 0) {
        errors.push('Please select or add at least one service');
      }
      break;
    
    case 7:
      if (!data.locationInfo?.isOnlineOnly) {
        if (!data.locationInfo?.city) {
          errors.push('City is required for physical locations');
        }
        if (!data.locationInfo?.state) {
          errors.push('State/Province is required for physical locations');
        }
      }
      break;
    
    case 8:
      if (!data.websiteStructure?.type) {
        errors.push('Please select a website structure type');
      }
      if (data.websiteStructure?.type === 'single-page' && 
          (!data.websiteStructure.selectedSections || data.websiteStructure.selectedSections.length < 3)) {
        errors.push('Please select at least the required sections');
      }
      if (data.websiteStructure?.type === 'multi-page' &&
          (!data.websiteStructure.selectedPages || data.websiteStructure.selectedPages.length < 3)) {
        errors.push('Please select at least the required pages');      }
      break;
      case 9:
      // UPDATED: Remove theme selection validation since we use auto-detection
      // Only validate that colors are configured
      if (!data.themeConfig?.colorScheme?.primary) {
        errors.push('Please select a primary color');
      }
      break;
    
    case 10:
      // Final step - all previous validations should pass
      break;
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};

export const useWizardStore = create<WizardStore>()(
  persist(
    immer((set, get) => ({
      // Data
      data: initialWizardData,
      stepCompletion: initialStepCompletion,
      currentStep: 1,
      isGenerationComplete: false,

      // Navigation
      goToStep: (step: number) => {
        const store = get();
        if (store.canNavigateToStep(step)) {
          set((state) => {
            state.currentStep = step;
          });
        }
      },

      nextStep: () => {
        const store = get();
        const nextStep = Math.min(store.currentStep + 1, 10);
        
        // Validate current step before moving
        if (store.validateStep(store.currentStep)) {
          store.completeStep(store.currentStep);
          set((state) => {
            state.currentStep = nextStep;
          });
        }
      },

      previousStep: () => {
        set((state) => {
          state.currentStep = Math.max(state.currentStep - 1, 1);
        });
      },

      // Data Management
      updateData: (step: keyof WizardData, value: any) => {
        set((state) => {
          (state.data as any)[step] = value;
        });
        
        // Auto-save to storage
        setTimeout(() => {
          get().saveToStorage();
        }, 100);
      },

      updateStepData: (step: number, data: Partial<WizardData>) => {
        set((state) => {
          Object.keys(data).forEach((key) => {
            (state.data as any)[key] = (data as any)[key];
          });
        });
        
        // Validate the updated step
        const validation = validateStepData(step, get().data);
        set((state) => {
          state.stepCompletion[step] = {
            ...state.stepCompletion[step],
            isValid: validation.isValid,
            errors: validation.errors,
          };
        });
        
        // Auto-save to storage
        setTimeout(() => {
          get().saveToStorage();
        }, 100);
      },

      // Validation
      validateStep: (step: number) => {
        const store = get();
        const validation = validateStepData(step, store.data);
        
        set((state) => {
          state.stepCompletion[step] = {
            ...state.stepCompletion[step],
            isValid: validation.isValid,
            errors: validation.errors,
          };
        });
        
        return validation.isValid;
      },      completeStep: (step: number) => {
        set((state) => {
          state.stepCompletion[step] = {
            ...state.stepCompletion[step],
            isCompleted: true,
            completedAt: new Date(),
          };
        });
      },

      // Generation Management
      setGenerationComplete: (complete: boolean) => {
        set((state) => {
          state.isGenerationComplete = complete;
        });
      },

      // Persistence
      saveToStorage: () => {
        // This is handled automatically by the persist middleware
        // but can be used for manual saves or additional storage logic
      },

      loadFromStorage: () => {
        // This is handled automatically by the persist middleware
        // but can be used for manual loads or data migration
      },      clearData: () => {
        set((state) => {
          state.data = initialWizardData;
          state.stepCompletion = initialStepCompletion;
          state.currentStep = 1;
          state.isGenerationComplete = false;
        });
      },

      // Utilities
      getProgress: () => {
        const store = get();
        const completedSteps = Object.values(store.stepCompletion).filter(
          (step) => step.isCompleted
        ).length;
        return Math.round((completedSteps / 10) * 100);
      },

      canNavigateToStep: (step: number) => {
        const store = get();
        
        // Can always go to step 1
        if (step === 1) return true;
        
        // Can go to next step if current step is completed
        if (step === store.currentStep + 1) {
          return store.stepCompletion[store.currentStep]?.isCompleted || false;
        }
        
        // Can go to any previous step
        if (step < store.currentStep) return true;
        
        // Can go to any completed step
        return store.stepCompletion[step]?.isCompleted || false;
      },

      getStepErrors: (step: number) => {
        const store = get();
        return store.stepCompletion[step]?.errors || [];
      },
    })),
    {
      name: 'wizard-storage',
      storage: createJSONStorage(() => localStorage),      partialize: (state) => ({
        data: state.data,
        stepCompletion: state.stepCompletion,
        currentStep: state.currentStep,
        isGenerationComplete: state.isGenerationComplete,
      }),
    }
  )
);

// Legacy export for backward compatibility
export const { useWizardStore: useSimpleWizardStore } = { useWizardStore };
