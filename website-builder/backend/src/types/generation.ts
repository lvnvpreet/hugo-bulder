// Generation types and validation
export interface GenerationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  error?: string;
}

export interface ContentPage {
  type: string;
  title: string;
  content: string;
  data: Record<string, any>;
  order: number;
}

export interface AIContentRequest {
  projectData: any;
  contentType: string;
  tone: string;
  length: 'short' | 'medium' | 'long';
  keywords?: string[];
  targetAudience?: string;
  brandVoice?: string;
  additionalContext?: string;
}

export interface AIContentResponse {
  content: string;
  title?: string;
  description?: string;
  keywords?: string[];
  metadata?: Record<string, any>;
  suggestions?: string[];
  confidence: number;
  processingTime: number;
}

export const GENERATION_STEPS = {
  INITIALIZING: {
    id: 'initializing',
    name: 'Initializing',
    description: 'Setting up generation environment',
  },
  ANALYZING_PROJECT: {
    id: 'analyzing_project',
    name: 'Analyzing Project',
    description: 'Processing wizard data and requirements',
  },
  GENERATING_CONTENT: {
    id: 'generating_content',
    name: 'Generating Content',
    description: 'Creating AI-powered content for your website',
  },
  OPTIMIZING_SEO: {
    id: 'optimizing_seo',
    name: 'Optimizing SEO',
    description: 'Enhancing content for search engines',
  },
  BUILDING_STRUCTURE: {
    id: 'building_structure',
    name: 'Building Structure',
    description: 'Creating Hugo site structure and files',
  },
  APPLYING_THEME: {
    id: 'applying_theme',
    name: 'Applying Theme',
    description: 'Configuring selected Hugo theme',
  },
  CUSTOMIZING_DESIGN: {
    id: 'customizing_design',
    name: 'Customizing Design',
    description: 'Applying custom colors, fonts, and styling',
  },
  BUILDING_SITE: {
    id: 'building_site',
    name: 'Building Site',
    description: 'Compiling static site with Hugo',
  },
  OPTIMIZING_ASSETS: {
    id: 'optimizing_assets',
    name: 'Optimizing Assets',
    description: 'Compressing images and optimizing files',
  },
  PACKAGING: {
    id: 'packaging',
    name: 'Packaging',
    description: 'Creating downloadable archive',
  },
  FINALIZING: {
    id: 'finalizing',
    name: 'Finalizing',
    description: 'Completing generation and cleanup',
  },
} as const;

export const SUPPORTED_HUGO_THEMES = [
  'ananke',
  'papermod',
  'bigspring',
  'restaurant',
  'hargo',
  'terminal',
  'clarity',
  'mainroad',
] as const;

export const AI_MODELS = [
  'gpt-4',
  'gpt-3.5-turbo',
  'llama3',
  'mistral',
] as const;

export const CONTENT_TONES = [
  'professional',
  'casual',
  'friendly',
  'formal',
  'creative',
  'authoritative',
  'conversational',
  'technical',
] as const;

export const GENERATION_ERRORS = {
  PROJECT_NOT_FOUND: 'Project not found or access denied',
  WIZARD_INCOMPLETE: 'Project wizard is not completed',
  THEME_NOT_SUPPORTED: 'Selected Hugo theme is not supported',
  AI_SERVICE_ERROR: 'AI content generation service error',
  HUGO_BUILD_ERROR: 'Hugo site build failed',
  PACKAGING_ERROR: 'Site packaging failed',
  DISK_SPACE_ERROR: 'Insufficient disk space for generation',
  GENERATION_TIMEOUT: 'Generation process timed out',
  INVALID_CUSTOMIZATIONS: 'Invalid theme customizations provided',
  CONCURRENT_GENERATION: 'Another generation is already in progress for this project',
} as const;

export type GenerationError = keyof typeof GENERATION_ERRORS;

export class GenerationValidationError extends Error {
  constructor(
    public code: string,
    message?: string,
    public details?: any
  ) {
    super(message || GENERATION_ERRORS[code as GenerationError]);
    this.name = 'GenerationValidationError';
  }
}

// Updated validation function to return proper validation result
export function validateGenerationOptions(options: any): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  try {
    // Only require hugoTheme if auto-detection is not enabled
    if (!options.hugoTheme && !options.autoDetectTheme) {
      errors.push('Hugo theme is required when auto-detection is disabled');
    }

    // Validate theme if provided
    if (options.hugoTheme && !SUPPORTED_HUGO_THEMES.includes(options.hugoTheme)) {
      errors.push(`Theme '${options.hugoTheme}' is not supported`);
    }

    if (options.contentOptions?.aiModel && !AI_MODELS.includes(options.contentOptions.aiModel)) {
      errors.push(`AI model '${options.contentOptions.aiModel}' is not supported`);
    }

    if (options.contentOptions?.tone && !CONTENT_TONES.includes(options.contentOptions.tone)) {
      errors.push(`Content tone '${options.contentOptions.tone}' is not supported`);
    }

    // Validate customizations if provided
    if (options.customizations) {
      if (options.customizations.colors) {
        for (const [key, value] of Object.entries(options.customizations.colors)) {
          // Skip validation for 'name' field - it's just a text label
          if (key === 'name') {
            continue;
          }
          
          // Only validate actual color fields (primary, secondary, accent, background, text)
          if (typeof value === 'string' && value.startsWith('#') && !value.match(/^#[0-9A-Fa-f]{6}$/)) {
            errors.push(`Invalid color format for ${key}: ${value}`);
          }
        }
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    errors.push('Validation failed due to unexpected error');
    return {
      isValid: false,
      errors
    };
  }
}

export function createGenerationSteps(): GenerationStep[] {
  return Object.values(GENERATION_STEPS).map(step => ({
    ...step,
    status: 'pending' as const,
    progress: 0,
  }));
}

export function calculateGenerationProgress(steps: GenerationStep[]): number {
  const totalSteps = steps.length;
  const completedSteps = steps.filter(step => step.status === 'completed').length;
  const runningSteps = steps.filter(step => step.status === 'running');
  
  if (runningSteps.length > 0) {
    const runningProgress = runningSteps.reduce((sum, step) => sum + step.progress, 0);
    return Math.round(((completedSteps + runningProgress / 100) / totalSteps) * 100);
  }
  
  return Math.round((completedSteps / totalSteps) * 100);
}