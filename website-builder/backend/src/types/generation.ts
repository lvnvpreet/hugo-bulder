import { SiteGenerationStatus } from '@prisma/client';

export interface GenerationStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: number;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  details?: Record<string, any>;
}

export interface GenerationWebhook {
  url: string;
  events: ('started' | 'progress' | 'completed' | 'failed')[];
  headers?: Record<string, string>;
}

export interface GenerationMetrics {
  totalGenerations: number;
  successfulGenerations: number;
  failedGenerations: number;
  averageGenerationTime: number;
  totalProcessingTime: number;
  popularThemes: Array<{ theme: string; count: number }>;
  generationsByStatus: Record<SiteGenerationStatus, number>;
  generationsByDay: Array<{ date: string; count: number }>;
  performanceMetrics: {
    avgAiProcessingTime: number;
    avgHugoBuildTime: number;
    avgPackagingTime: number;
  };
}

export interface GenerationTemplate {
  id: string;
  name: string;
  description: string;
  hugoTheme: string;
  customizations: {
    colors: Record<string, string>;
    fonts: Record<string, string>;
    layout: Record<string, any>;
  };
  contentOptions: {
    aiModel: string;
    tone: string;
    length: 'short' | 'medium' | 'long';
    includeSEO: boolean;
  };
  isDefault: boolean;
  createdBy: string;
  createdAt: Date;
  usageCount: number;
}

export interface HugoSiteConfig {
  baseURL: string;
  languageCode: string;
  title: string;
  description: string;
  theme: string;
  params: Record<string, any>;
  menu: {
    main: Array<{
      name: string;
      url: string;
      weight: number;
    }>;
  };
  markup: {
    goldmark: {
      renderer: {
        unsafe: boolean;
      };
    };
  };
  outputs: {
    home: string[];
    page: string[];
    section: string[];
  };
}

export interface ContentPage {
  name: string;
  title: string;
  content: string;
  frontMatter: {
    title: string;
    date: string;
    draft: boolean;
    description?: string;
    keywords?: string[];
    weight?: number;
    menu?: string;
    type?: string;
    layout?: string;
  };
  sections?: ContentSection[];
}

export interface ContentSection {
  id: string;
  type: string;
  title?: string;
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
  'business-pro',
  'restaurant-deluxe',
  'medical-care',
  'creative-studio',
  'tech-startup',
  'retail-store',
  'academic',
  'mainroad',
  'clarity',
  'terminal',
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
    public code: GenerationError,
    message?: string,
    public details?: any
  ) {
    super(message || GENERATION_ERRORS[code]);
    this.name = 'GenerationValidationError';
  }
}

export function validateGenerationOptions(options: any): void {
  if (!options.hugoTheme) {
    throw new GenerationValidationError('THEME_NOT_SUPPORTED', 'Hugo theme is required');
  }

  if (!SUPPORTED_HUGO_THEMES.includes(options.hugoTheme)) {
    throw new GenerationValidationError(
      'THEME_NOT_SUPPORTED',
      `Theme '${options.hugoTheme}' is not supported`
    );
  }

  if (options.contentOptions?.aiModel && !AI_MODELS.includes(options.contentOptions.aiModel)) {
    throw new GenerationValidationError(
      'AI_SERVICE_ERROR',
      `AI model '${options.contentOptions.aiModel}' is not supported`
    );
  }

  if (options.contentOptions?.tone && !CONTENT_TONES.includes(options.contentOptions.tone)) {
    throw new GenerationValidationError(
      'INVALID_CUSTOMIZATIONS',
      `Content tone '${options.contentOptions.tone}' is not supported`
    );
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
    return Math.round(((completedSteps * 100) + runningProgress) / totalSteps);
  }
  
  return Math.round((completedSteps / totalSteps) * 100);
}

export function getGenerationStatusFromSteps(steps: GenerationStep[]): SiteGenerationStatus {
  if (steps.some(step => step.status === 'failed')) {
    return SiteGenerationStatus.FAILED;
  }
  
  if (steps.every(step => step.status === 'completed')) {
    return SiteGenerationStatus.COMPLETED;
  }
  
  if (steps.some(step => step.status === 'running')) {
    const runningStep = steps.find(step => step.status === 'running');
    
    if (runningStep?.id === 'generating_content') {
      return SiteGenerationStatus.GENERATING_CONTENT;
    }
    
    if (runningStep?.id === 'building_site') {
      return SiteGenerationStatus.BUILDING_SITE;
    }
    
    if (runningStep?.id === 'packaging') {
      return SiteGenerationStatus.PACKAGING;
    }
  }
  
  return SiteGenerationStatus.PENDING;
}
