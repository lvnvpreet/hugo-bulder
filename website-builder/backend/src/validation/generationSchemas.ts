import Joi from 'joi';

// Schema for starting website generation
export const startGenerationSchema = Joi.object({
  hugoTheme: Joi.string().required().messages({
    'string.empty': 'Hugo theme is required',
    'any.required': 'Hugo theme is required',
  }),
  customizations: Joi.object({
    colors: Joi.object().pattern(Joi.string(), Joi.string().pattern(/^#[0-9a-fA-F]{6}$/)).optional(),
    fonts: Joi.object().pattern(Joi.string(), Joi.string()).optional(),
    layout: Joi.object().optional(),
  }).optional(),
  contentOptions: Joi.object({
    aiModel: Joi.string().valid('gpt-4', 'gpt-3.5-turbo', 'llama3', 'mistral').optional(),
    tone: Joi.string().valid('professional', 'casual', 'friendly', 'formal', 'creative').optional(),
    length: Joi.string().valid('short', 'medium', 'long').optional(),
    includeSEO: Joi.boolean().optional(),
  }).optional(),
});

// Schema for generation status query parameters
export const generationStatusQuerySchema = Joi.object({
  include: Joi.string().valid('project', 'logs', 'metrics').optional(),
});

// Schema for generation history query parameters
export const generationHistoryQuerySchema = Joi.object({
  page: Joi.number().integer().min(1).default(1),
  pageSize: Joi.number().integer().min(1).max(100).default(10),
  status: Joi.string().valid(
    'PENDING',
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
  generationId: Joi.string().required().messages({
    'string.empty': 'Generation ID is required',
    'any.required': 'Generation ID is required',
  }),
});

// Schema for project ID parameter
export const projectIdSchema = Joi.object({
  projectId: Joi.string().required().messages({
    'string.empty': 'Project ID is required',
    'any.required': 'Project ID is required',
  }),
});

// Schema for bulk operations
export const bulkGenerationSchema = Joi.object({
  projectIds: Joi.array().items(Joi.string()).min(1).max(10).required(),
  hugoTheme: Joi.string().required(),
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

export const generationSchemas = {
  startGeneration: startGenerationSchema,
  generationStatusQuery: generationStatusQuerySchema,
  generationHistory: generationHistoryQuerySchema,
  generationId: generationIdSchema,
  projectId: projectIdSchema,
  bulkGeneration: bulkGenerationSchema,
  updateGenerationConfig: updateGenerationConfigSchema,
  generationAnalytics: generationAnalyticsSchema,
};
