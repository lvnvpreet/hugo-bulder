import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/services/api';
import type { WizardData, GenerationRequest, GenerationStatus } from '@/types';

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
      ...initialState,

      startGeneration: async (data: WizardData) => {
        try {
          set({ 
            isGenerating: true, 
            progress: 0, 
            currentStep: 'analyzing',
            error: null 
          });

          // Transform wizard data to generation request
          const request: GenerationRequest = {
            projectBasics: data.projectBasics!,
            designPreferences: data.designPreferences!,
            featuresSelection: data.featuresSelection!,
            contentDetails: data.contentDetails!,
          };

          // Start generation
          const response = await api.generation.start(request);
          
          set({ 
            generationId: response.generationId,
            currentStep: 'content',
            progress: 10 
          });

          // Poll for status updates
          const pollInterval = setInterval(async () => {
            try {
              const status = await api.generation.getStatus(response.generationId);
              
              set({
                progress: status.progress,
                currentStep: status.currentStep,
              });

              if (status.status === 'completed') {
                clearInterval(pollInterval);
                set({
                  isGenerating: false,
                  progress: 100,
                  result: status.result,
                });
              } else if (status.status === 'failed') {
                clearInterval(pollInterval);
                set({
                  isGenerating: false,
                  error: status.error || 'Generation failed',
                });
              }
            } catch (error) {
              clearInterval(pollInterval);
              set({
                isGenerating: false,
                error: 'Failed to check generation status',
              });
            }
          }, 2000);

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
      },

      checkStatus: async () => {
        const { generationId } = get();
        if (!generationId) return;

        try {
          const status = await api.generation.getStatus(generationId);
          set({
            progress: status.progress,
            currentStep: status.currentStep,
            isGenerating: status.status === 'processing',
          });

          if (status.status === 'completed') {
            set({
              result: status.result,
              isGenerating: false,
            });
          } else if (status.status === 'failed') {
            set({
              error: status.error || 'Generation failed',
              isGenerating: false,
            });
          }
        } catch (error: any) {
          set({
            error: error.message || 'Failed to check status',
            isGenerating: false,
          });
        }
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
