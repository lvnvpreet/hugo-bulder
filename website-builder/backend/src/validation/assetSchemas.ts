import Joi from 'joi';

// Asset upload validation
export const assetUploadSchema = Joi.object({
  projectId: Joi.string().optional(),
  usage: Joi.string().max(100).optional(),
  alt: Joi.string().max(255).optional(),
  caption: Joi.string().max(500).optional(),
  generateThumbnail: Joi.boolean().default(true),
  generateWebP: Joi.boolean().default(true),
  resizeOptions: Joi.object({
    maxWidth: Joi.number().min(100).max(4000).optional(),
    maxHeight: Joi.number().min(100).max(4000).optional(),
    quality: Joi.number().min(10).max(100).default(85),
  }).optional(),
});

// Asset update validation
export const assetUpdateSchema = Joi.object({
  alt: Joi.string().max(255).optional(),
  caption: Joi.string().max(500).optional(),
  usage: Joi.string().max(100).optional(),
}).min(1);

// Asset query validation
export const assetQuerySchema = Joi.object({
  projectId: Joi.string().optional(),
  assetType: Joi.string().valid('IMAGE', 'DOCUMENT', 'VIDEO', 'AUDIO', 'OTHER').optional(),
  page: Joi.number().min(1).default(1),
  pageSize: Joi.number().min(1).max(100).default(20),
  search: Joi.string().max(100).optional(),
});

// Asset ID validation
export const assetIdSchema = Joi.object({
  id: Joi.string().required(),
});

// Bulk upload validation
export const bulkUploadSchema = Joi.object({
  projectId: Joi.string().optional(),
  usage: Joi.string().max(100).optional(),
  generateThumbnail: Joi.boolean().default(true),
  generateWebP: Joi.boolean().default(true),
  resizeOptions: Joi.object({
    maxWidth: Joi.number().min(100).max(4000).optional(),
    maxHeight: Joi.number().min(100).max(4000).optional(),
    quality: Joi.number().min(10).max(100).default(85),
  }).optional(),
});

// Asset processing options validation
export const processingOptionsSchema = Joi.object({
  resize: Joi.object({
    width: Joi.number().min(10).max(4000).optional(),
    height: Joi.number().min(10).max(4000).optional(),
    fit: Joi.string().valid('cover', 'contain', 'fill', 'inside', 'outside').default('inside'),
    quality: Joi.number().min(10).max(100).default(85),
  }).optional(),
  format: Joi.string().valid('jpeg', 'png', 'webp', 'avif').optional(),
  optimize: Joi.boolean().default(true),
});

export const assetSchemas = {
  upload: assetUploadSchema,
  update: assetUpdateSchema,
  query: assetQuerySchema,
  assetId: assetIdSchema,
  bulkUpload: bulkUploadSchema,
  processingOptions: processingOptionsSchema,
};
