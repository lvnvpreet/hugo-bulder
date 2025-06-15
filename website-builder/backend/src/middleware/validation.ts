import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { createValidationError } from './errorHandler.js';

// Validation middleware factory
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          details,
        },
      });
      return;
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

// Query parameter validation
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.query, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'QUERY_VALIDATION_FAILED',
          message: 'Query parameter validation failed',
          details,
        },
      });
      return;
    }

    // Replace req.query with validated data
    req.query = value;
    next();
  };
};

// Route parameter validation
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.params, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const details = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value,
      }));

      res.status(400).json({
        success: false,
        error: {
          code: 'PARAMS_VALIDATION_FAILED',
          message: 'Route parameter validation failed',
          details,
        },
      });
      return;
    }

    // Replace req.params with validated data
    req.params = value;
    next();
  };
};

// Input sanitization functions
export const sanitizeInput = {
  // Remove HTML tags and trim whitespace
  cleanText: (text: string): string => {
    if (typeof text !== 'string') return '';
    return text
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<[^>]*>/g, '')
      .trim();
  },

  // Sanitize email
  cleanEmail: (email: string): string => {
    if (typeof email !== 'string') return '';
    return email.toLowerCase().trim();
  },

  // Sanitize and validate URLs
  cleanUrl: (url: string): string => {
    if (typeof url !== 'string') return '';
    try {
      const cleanUrl = new URL(url.trim());
      return cleanUrl.toString();
    } catch {
      return '';
    }
  },

  // Remove potentially dangerous characters from filenames
  cleanFilename: (filename: string): string => {
    if (typeof filename !== 'string') return '';
    return filename
      .replace(/[<>:"/\\|?*]/g, '')
      .replace(/\.\./g, '')
      .trim();
  },

  // Sanitize object recursively
  cleanObject: (obj: any): any => {
    if (obj === null || obj === undefined) return obj;
    
    if (typeof obj === 'string') {
      return sanitizeInput.cleanText(obj);
    }
    
    if (Array.isArray(obj)) {
      return obj.map(item => sanitizeInput.cleanObject(item));
    }
    
    if (typeof obj === 'object') {
      const cleaned: any = {};
      for (const [key, value] of Object.entries(obj)) {
        cleaned[key] = sanitizeInput.cleanObject(value);
      }
      return cleaned;
    }
    
    return obj;
  },
};

// Common validation schemas
export const commonSchemas = {
  // MongoDB ObjectId
  objectId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).message('Invalid ID format'),
  
  // UUID
  uuid: Joi.string().uuid().message('Invalid UUID format'),
  
  // Email
  email: Joi.string().email().lowercase().trim().max(255),
  
  // Strong password
  password: Joi.string()
    .min(8)
    .max(128)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .message('Password must contain at least 8 characters with uppercase, lowercase, number, and special character'),
  
  // URL
  url: Joi.string().uri().max(2048),
  
  // Pagination
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    offset: Joi.number().integer().min(0),
  }),
  
  // Search query
  search: Joi.string().trim().max(100).allow(''),
  
  // Date range
  dateRange: Joi.object({
    start: Joi.date().iso(),
    end: Joi.date().iso().greater(Joi.ref('start')),
  }),
  
  // File upload metadata
  fileMetadata: Joi.object({
    alt: Joi.string().max(255).allow(''),
    caption: Joi.string().max(500).allow(''),
    usage: Joi.string().valid('logo', 'header', 'content', 'background', 'icon'),
  }),
};

// Body sanitization middleware
export const sanitizeBody = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput.cleanObject(req.body);
  }
  next();
};

// File validation helper
export const validateFileUpload = (
  allowedTypes: string[],
  maxSize: number = 10 * 1024 * 1024 // 10MB default
) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.file && !req.files) {
      next();
      return;
    }

    const files = req.files ? (Array.isArray(req.files) ? req.files : Object.values(req.files).flat()) : [req.file];
    
    for (const file of files) {
      if (!file) continue;
      
      // Check file type
      if (!allowedTypes.includes(file.mimetype)) {
        res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FILE_TYPE',
            message: `File type ${file.mimetype} not allowed. Allowed types: ${allowedTypes.join(', ')}`,
          },
        });
        return;
      }
      
      // Check file size
      if (file.size > maxSize) {
        res.status(413).json({
          success: false,
          error: {
            code: 'FILE_TOO_LARGE',
            message: `File size ${file.size} bytes exceeds maximum allowed size of ${maxSize} bytes`,
          },
        });
        return;
      }
    }

    next();
  };
};

// Content-Type validation
export const validateContentType = (allowedTypes: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const contentType = req.get('Content-Type');
    
    if (!contentType || !allowedTypes.some(type => contentType.includes(type))) {
      res.status(415).json({
        success: false,
        error: {
          code: 'UNSUPPORTED_MEDIA_TYPE',
          message: `Content-Type must be one of: ${allowedTypes.join(', ')}`,
        },
      });
      return;
    }
    
    next();
  };
};

export const validationMiddleware = validate;
export default validate;
