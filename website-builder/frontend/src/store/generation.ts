import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WizardData } from '@/types/wizard';
import { apiClient } from '@/services/api';

export interface GenerationState {
  isGenerating: boolean;
  progress: number;
  currentStep: string;
  error: string | null;
  generationId: string | null;
  result: any | null;
}

export interface GenerationActions {
  startGeneration: (projectId: string, data: WizardData) => Promise<void>;
  updateProgress: (progress: number, step: string) => void;
  setError: (error: string) => void;
  reset: () => void;
  checkStatus: () => Promise<void>;
  startStatusPolling: () => void;
  stopStatusPolling: () => void;
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

// Polling interval
let statusPollingInterval: NodeJS.Timeout | null = null;

export const useGenerationStore = create<GenerationStore>()(
  persist(
    (set, get) => ({
      ...initialState,      startGeneration: async (projectId: string, data: WizardData) => {
        try {
          set({ 
            isGenerating: true, 
            progress: 0, 
            currentStep: 'Starting generation...',
            error: null 
          });

          console.log('🚀 Starting generation for project:', projectId);
          
          // Prepare generation request data
          const generationRequest = {
            autoDetectTheme: true, // Always use auto-detection
            customizations: data.themeConfig ? {
              colors: data.themeConfig.colorScheme,
              typography: data.themeConfig.typography,
              layout: data.themeConfig.layout
            } : {},
            contentOptions: {
              tone: 'professional',
              length: 'medium',
              includeSEO: true
            }
          };
          
          // Start the generation process
          const response = await apiClient.post(`/generations/${projectId}/start`, generationRequest);
          
          const generationId = response.data.data.generationId;
          console.log('✅ Generation started with ID:', generationId);
          
          set({ 
            generationId,
            currentStep: 'Generation started',
            progress: 5 
          });

          // Start polling for status updates
          get().startStatusPolling();

        } catch (error: any) {
          console.error('❌ Failed to start generation:', error);
          set({
            isGenerating: false,
            error: error.response?.data?.error?.message || error.message || 'Failed to start generation',
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

        try {
          console.log('📊 Checking status for generation:', generationId);
          const response = await apiClient.get(`/generations/${generationId}/status`);
          const status = response.data.data;
          
          console.log('📊 Generation status:', status);
          
          set({
            progress: status.progress || 0,
            currentStep: status.currentStep || 'Processing...',
            isGenerating: status.status !== 'COMPLETED' && status.status !== 'FAILED'
          });

          // If completed or failed, stop polling
          if (status.status === 'COMPLETED') {
            set({
              isGenerating: false,
              progress: 100,
              currentStep: 'Completed!',
              result: status
            });
            get().stopStatusPolling();
          } else if (status.status === 'FAILED') {
            set({
              isGenerating: false,
              error: status.errorLog || 'Generation failed',
            });
            get().stopStatusPolling();
          }
        } catch (error: any) {
          console.error('❌ Failed to check generation status:', error);
          // Don't stop polling on temporary errors, just log them
          if (error.response?.status === 404) {
            set({
              isGenerating: false,
              error: 'Generation not found'
            });
            get().stopStatusPolling();
          }
        }
      },

      startStatusPolling: () => {
        // Stop any existing polling
        get().stopStatusPolling();
        
        // Start polling every 2 seconds
        statusPollingInterval = setInterval(() => {
          get().checkStatus();
        }, 2000);
        
        console.log('🔄 Started status polling');
      },

      stopStatusPolling: () => {
        if (statusPollingInterval) {
          clearInterval(statusPollingInterval);
          statusPollingInterval = null;
          console.log('⏹️ Stopped status polling');
        }
      },      reset: () => {
        get().stopStatusPolling();
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
