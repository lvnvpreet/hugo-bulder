import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WizardData } from '@/types/wizard';

export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  generationId: string | null;
  result: any | null;
}

export interface GenerationActions {
  startGeneration: (data: WizardData) => Promise<void>;
  updateProgress: (progress: number, step: string) => void;
  setError: (error: string) => void;
  reset: () => void;
  checkStatus: () => Promise<void>;
}

export type GenerationStore = GenerationState & GenerationActions;

const initialState: GenerationState = {
  isGenerating: false,
  progress: 0,
  currentStep: '',
  error: null,
  generationId: null,
  result: null,
};

export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set, get) => ({
      ...initialState,      startGeneration: async (_data: WizardData) => {
        try {
          set({ 
            isGenerating: true, 
            progress: 0, 
            currentStep: 'analyzing',
            error: null 
          });

          // Mock generation for now - will be replaced with actual API calls later
          const generationId = 'mock-gen-' + Date.now();
          
          set({ 
            generationId,
            currentStep: 'content',
            progress: 50 
          });

          // Simulate generation completion after 3 seconds
          setTimeout(() => {
            set({
              isGenerating: false,
              progress: 100,
              currentStep: 'completed',
              result: 'Mock generated content'
            });
          }, 3000);

        } catch (error: any) {
          set({
            isGenerating: false,
            error: error.message || 'Failed to start generation',
          });
          throw error;
        }
      },

      updateProgress: (progress: number, step: string) => {
        set({ progress, currentStep: step });
      },

      setError: (error: string) => {
        set({ error, isGenerating: false });
      },      checkStatus: async () => {
        const { generationId } = get();
        if (!generationId) return;

        // Mock status check
        set({
          progress: 100,
          currentStep: 'completed',
          isGenerating: false,
          result: 'Mock generated content'
        });
      },

      reset: () => {
        set(initialState);
      },
    }),
    {
      name: 'generation-store',
      partialize: (state) => ({
        generationId: state.generationId,
        result: state.result,
      }),
    }
  )
);
