import Joi from 'joi';
import { commonSchemas } from '../middleware/validation';

const projectSchemas = {
  // Project creation validation
  createProject: Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Project name is required',
        'string.min': 'Project name cannot be empty',
        'string.max': 'Project name must be less than 100 characters'
      }),
    
    description: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Description must be less than 500 characters'
      }),
    
    websiteType: Joi.string()
      .valid(
        'business',
        'portfolio',
        'blog',
        'ecommerce',
        'nonprofit',
        'restaurant',
        'agency',
        'personal',
        'landing-page',
        'other'
      )
      .required()
      .messages({
        'any.only': 'Invalid website type',
        'any.required': 'Website type is required'
      })
  }),

  // Project update validation
  updateProject: Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .optional()
      .messages({
        'string.empty': 'Project name cannot be empty',
        'string.min': 'Project name cannot be empty',
        'string.max': 'Project name must be less than 100 characters'
      }),
    
    description: Joi.string()
      .trim()
      .max(500)
      .allow('')
      .optional()
      .messages({
        'string.max': 'Description must be less than 500 characters'
      }),
    
    websiteType: Joi.string()
      .valid(
        'business',
        'portfolio',
        'blog',
        'ecommerce',
        'nonprofit',
        'restaurant',
        'agency',
        'personal',
        'landing-page',
        'other'
      )
      .optional()
      .messages({
        'any.only': 'Invalid website type'
      })
  }),

  // Project listing query parameters
  listProjects: Joi.object({
    status: Joi.string()
      .valid('DRAFT', 'READY_FOR_GENERATION', 'GENERATING', 'COMPLETED', 'ERROR')
      .optional(),
    
    websiteType: Joi.string()
      .valid(
        'business',
        'portfolio',
        'blog',
        'ecommerce',
        'nonprofit',
        'restaurant',
        'agency',
        'personal',
        'landing-page',
        'other'
      )
      .optional(),
    
    limit: Joi.number()
      .integer()
      .min(1)
      .max(100)
      .optional()
      .default(20),
    
    offset: Joi.number()
      .integer()
      .min(0)
      .optional()
      .default(0)
  }),

  // Project ID parameter validation
  projectId: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'Invalid project ID format',
        'any.required': 'Project ID is required'
      })
  }),

  // Project duplication validation
  duplicateProject: Joi.object({
    name: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required()
      .messages({
        'string.empty': 'Project name is required',
        'string.min': 'Project name cannot be empty',
        'string.max': 'Project name must be less than 100 characters'
      })
  }),

  // Wizard step parameters
  wizardStepParams: Joi.object({
    id: Joi.string()
      .uuid()
      .required()
      .messages({
        'string.guid': 'Invalid project ID format',
        'any.required': 'Project ID is required'
      }),
    
    step: Joi.number()
      .integer()
      .min(1)
      .max(10)
      .required()
      .messages({
        'number.base': 'Step must be a number',
        'number.integer': 'Step must be an integer',
        'number.min': 'Step must be between 1 and 10',
        'number.max': 'Step must be between 1 and 10',
        'any.required': 'Step number is required'
      })
  }),

  // Wizard step data validation (flexible schema)
  wizardStepData: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(
      Joi.string(),
      Joi.number(),
      Joi.boolean(),
      Joi.array(),
      Joi.object()
    )
  ).min(1).messages({
    'object.min': 'Step data cannot be empty'
  }),

  // Step 1: Website Type
  step1: Joi.object({
    websiteType: Joi.string()
      .valid(
        'business',
        'portfolio',
        'blog',
        'ecommerce',
        'nonprofit',
        'restaurant',
        'agency',
        'personal',
        'landing-page',
        'other'
      )
      .required(),
    
    customType: Joi.when('websiteType', {
      is: 'other',
      then: Joi.string().trim().min(1).max(50).required(),
      otherwise: Joi.optional()
    })
  }),

  // Step 2: Business Category
  step2: Joi.object({
    businessCategory: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required(),
    
    subCategory: Joi.string()
      .trim()
      .max(100)
      .optional(),
    
    targetAudience: Joi.string()
      .trim()
      .max(200)
      .optional()
  }),

  // Step 3: Services
  step3: Joi.object({
    services: Joi.array()
      .items(
        Joi.object({
          id: Joi.string().optional(),
          name: Joi.string().trim().min(1).max(100).required(),
          description: Joi.string().trim().max(300).optional(),
          isCustom: Joi.boolean().optional()
        })
      )
      .min(1)
      .max(20)
      .required()
      .messages({
        'array.min': 'At least one service must be selected',
        'array.max': 'Maximum 20 services allowed'
      })
  }),

  // Step 4: Website Structure
  step4: Joi.object({
    structure: Joi.string()
      .valid('single-page', 'multi-page')
      .required(),
    
    pages: Joi.when('structure', {
      is: 'multi-page',
      then: Joi.array()
        .items(
          Joi.object({
            name: Joi.string().trim().min(1).max(50).required(),
            slug: Joi.string().trim().min(1).max(50).required(),
            type: Joi.string().valid('home', 'about', 'services', 'contact', 'blog', 'custom').required()
          })
        )
        .min(2)
        .max(20)
        .required(),
      otherwise: Joi.optional()
    }),

    navigation: Joi.object({
      style: Joi.string().valid('header', 'sidebar', 'both').optional(),
      includeFooter: Joi.boolean().optional()
    }).optional()
  }),

  // Step 5: Hugo Theme
  step5: Joi.object({
    theme: Joi.string()
      .trim()
      .min(1)
      .required(),
    
    customizations: Joi.object({
      primaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondaryColor: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      fontFamily: Joi.string().trim().max(50).optional()
    }).optional()
  }),

  // Step 6: Business Information
  step6: Joi.object({
    businessName: Joi.string()
      .trim()
      .min(1)
      .max(100)
      .required(),
    
    tagline: Joi.string()
      .trim()
      .max(200)
      .optional(),
    
    description: Joi.string()
      .trim()
      .max(1000)
      .optional(),
    
    establishedYear: Joi.number()
      .integer()
      .min(1800)
      .max(new Date().getFullYear())
      .optional()
  }),

  // Step 7: Contact Information
  step7: Joi.object({
    email: commonSchemas.email.optional(),
    
    phone: Joi.string()
      .trim()
      .pattern(/^[\+]?[1-9][\d\s\-\(\)]{7,15}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid phone number format'
      }),
    
    address: Joi.object({
      street: Joi.string().trim().max(100).optional(),
      city: Joi.string().trim().max(50).optional(),
      state: Joi.string().trim().max(50).optional(),
      zipCode: Joi.string().trim().max(20).optional(),
      country: Joi.string().trim().max(50).optional()
    }).optional(),
    
    socialMedia: Joi.object({
      facebook: commonSchemas.url.optional(),
      twitter: commonSchemas.url.optional(),
      instagram: commonSchemas.url.optional(),
      linkedin: commonSchemas.url.optional(),
      youtube: commonSchemas.url.optional()
    }).optional(),
    
    website: commonSchemas.url.optional()
  }),

  // Step 8: Content & Media
  step8: Joi.object({
    logo: Joi.object({
      url: Joi.string().trim().optional(),
      alt: Joi.string().trim().max(100).optional()
    }).optional(),
    
    heroImage: Joi.object({
      url: Joi.string().trim().optional(),
      alt: Joi.string().trim().max(100).optional()
    }).optional(),
    
    aboutContent: Joi.string()
      .trim()
      .max(2000)
      .optional(),
    
    additionalImages: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().trim().required(),
          alt: Joi.string().trim().max(100).optional(),
          caption: Joi.string().trim().max(200).optional()
        })
      )
      .max(10)
      .optional()
  }),

  // Step 9: Customization
  step9: Joi.object({
    colorScheme: Joi.object({
      primary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      secondary: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional(),
      accent: Joi.string().pattern(/^#[0-9A-Fa-f]{6}$/).optional()
    }).optional(),
    
    typography: Joi.object({
      headingFont: Joi.string().trim().max(50).optional(),
      bodyFont: Joi.string().trim().max(50).optional()
    }).optional(),
    
    layout: Joi.object({
      headerStyle: Joi.string().valid('fixed', 'static', 'transparent').optional(),
      footerStyle: Joi.string().valid('minimal', 'detailed', 'contact-focused').optional()
    }).optional(),
    
    features: Joi.object({
      blog: Joi.boolean().optional(),
      testimonials: Joi.boolean().optional(),
      gallery: Joi.boolean().optional(),
      contactForm: Joi.boolean().optional(),
      newsletter: Joi.boolean().optional()
    }).optional()
  }),

  // Step 10: Review
  step10: Joi.object({
    reviewed: Joi.boolean().required(),
    notes: Joi.string().trim().max(500).optional(),
    readyForGeneration: Joi.boolean().optional()
  })
};

export { projectSchemas };
export default projectSchemas;
