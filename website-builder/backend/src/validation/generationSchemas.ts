import Joi from 'joi';

// Schema for starting website generation
export const startGenerationSchema = Joi.object({
  hugoTheme: Joi.string().valid(
    'ananke',
    'papermod', 
    'bigspring',
    'restaurant',
    'hargo',
    'terminal',
    'clarity',
    'mainroad'
  ).optional(),
  autoDetectTheme: Joi.boolean().default(false),
  customizations: Joi.object({
    colors: Joi.object({
      name: Joi.string().optional(), // This is just a text label, not a hex color
      primary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      accent: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      background: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      text: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
    }).optional(),
    fonts: Joi.object({
      headingFont: Joi.string().optional(),
      bodyFont: Joi.string().optional(),
      fontSize: Joi.string().valid('small', 'medium', 'large').optional(),
    }).optional(),
    layout: Joi.object({
      headerStyle: Joi.string().valid('standard', 'minimal', 'bold').optional(),
      footerStyle: Joi.string().valid('standard', 'minimal', 'detailed').optional(),
      sidebarEnabled: Joi.boolean().optional(),
    }).optional(),
  }).optional(),
  contentOptions: Joi.object({
    generateSampleContent: Joi.boolean().default(true),
    contentTone: Joi.string().valid(
      'professional',
      'casual',
      'friendly',
      'formal',
      'creative',
      'authoritative',
      'conversational',
      'technical'
    ).default('professional'),
    includeImages: Joi.boolean().default(true),
    seoOptimized: Joi.boolean().default(true),
    aiModel: Joi.string().valid('gpt-4', 'gpt-3.5-turbo', 'llama3', 'mistral').optional(),
    length: Joi.string().valid('short', 'medium', 'long').default('medium'),
  }).optional(),
}).unknown(false); // Don't allow unknown fields

// Schema for generation status query parameters
export const generationStatusQuerySchema = Joi.object({
  include: Joi.string().valid('project', 'logs', 'metrics').optional(),
});

// Schema for generation history query parameters (renamed from generationHistoryQuerySchema)
export const getHistorySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(50).default(10),
  status: Joi.string().valid(
    'PENDING',
    'PROCESSING',
    'GENERATING_CONTENT',
    'BUILDING_SITE',
    'PACKAGING',
    'COMPLETED',
    'FAILED',
    'EXPIRED'
  ).optional(),
  projectId: Joi.string().optional(),
  sortBy: Joi.string().valid('startedAt', 'completedAt', 'generationTime').default('startedAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});

// Schema for generation ID parameter
export const generationIdSchema = Joi.object({
  generationId: Joi.string().min(20).max(30).required().messages({
    'string.empty': 'Generation ID is required',
    'string.min': 'Invalid generation ID format',
    'string.max': 'Invalid generation ID format',
    'any.required': 'Generation ID is required',
  }),
});

// Schema for project ID parameter
export const projectIdSchema = Joi.object({
  projectId: Joi.string().min(20).max(30).required().messages({
    'string.empty': 'Project ID is required',
    'string.min': 'Invalid project ID format',
    'string.max': 'Invalid project ID format',
    'any.required': 'Project ID is required',
  }),
});

// Schema for bulk operations
export const bulkGenerationSchema = Joi.object({
  projectIds: Joi.array().items(Joi.string()).min(1).max(10).required(),
  hugoTheme: Joi.string().valid(
    'ananke',
    'papermod',
    'bigspring',
    'restaurant',
    'hargo',
    'terminal',
    'clarity',
    'mainroad'
  ).required(),
  customizations: Joi.object({
    colors: Joi.object().pattern(Joi.string(), Joi.string().pattern(/^#[0-9a-fA-F]{6}$/)).optional(),
    fonts: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
    layout: Joi.object().optional(),
  }).optional(),
});

// Schema for generation configuration update
export const updateGenerationConfigSchema = Joi.object({
  expiresAt: Joi.date().iso().greater('now').optional(),
  customizations: Joi.object({
    colors: Joi.object().pattern(Joi.string(), Joi.string().pattern(/^#[0-9a-fA-F]{6}$/)).optional(),
    fonts: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
    layout: Joi.object().optional(),
  }).optional(),
});

// Schema for generation analytics query
export const generationAnalyticsSchema = Joi.object({
  startDate: Joi.date().iso().optional(),
  endDate: Joi.date().iso().optional(),
  groupBy: Joi.string().valid('day', 'week', 'month').default('day'),
  projectId: Joi.string().optional(),
});

// Schema for detect theme endpoint parameter
export const detectThemeParamSchema = Joi.object({
  projectId: Joi.string().min(20).max(30).required().messages({
    'string.empty': 'Project ID is required',
    'string.min': 'Invalid project ID format',
    'string.max': 'Invalid project ID format',
    'any.required': 'Project ID is required',
  }),
});

// Export all schemas with consistent naming
export const generationSchemas = {
  startGeneration: startGenerationSchema,
  generationStatusQuery: generationStatusQuerySchema,
  getHistory: getHistorySchema, // This was missing and causing the error
  generationId: generationIdSchema,
  projectId: projectIdSchema,
  detectThemeParam: detectThemeParamSchema,
  bulkGeneration: bulkGenerationSchema,
  updateGenerationConfig: updateGenerationConfigSchema,
  generationAnalytics: generationAnalyticsSchema,
};