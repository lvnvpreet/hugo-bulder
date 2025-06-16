import Joi from 'joi';

// Common validation patterns
const emailSchema = Joi.string()
  .email({ tlds: { allow: false } })
  .lowercase()
  .trim()
  .max(255)
  .required();

const passwordSchema = Joi.string()
  .min(8)
  .max(128)
  .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .required()
  .messages({
    'string.pattern.base': 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character (@$!%*?&)',
    'string.min': 'Password must be at least 8 characters long',
    'string.max': 'Password must be less than 128 characters long',
  });

const nameSchema = Joi.string()
  .trim()
  .min(1)
  .max(100)
  .required()
  .messages({
    'string.empty': 'Name is required',
    'string.min': 'Name must be at least 1 character long',
    'string.max': 'Name must be less than 100 characters long',
  });

// Registration validation schema
export const registerSchema = Joi.object({
  email: emailSchema,
  password: passwordSchema,
  name: nameSchema,
}).strict();

// Login validation schema
export const loginSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
}).strict();

// Email verification schema
export const verifyEmailSchema = Joi.object({
  token: Joi.string()
    .length(64)
    .pattern(/^[a-f0-9]+$/)
    .required()
    .messages({
      'string.length': 'Invalid verification token format',
      'string.pattern.base': 'Invalid verification token format',
    }),
}).strict();

// Password reset request schema
export const passwordResetRequestSchema = Joi.object({
  email: emailSchema,
}).strict();

// Password reset schema
export const passwordResetSchema = Joi.object({
  token: Joi.string()
    .length(64)
    .pattern(/^[a-f0-9]+$/)
    .required()
    .messages({
      'string.length': 'Invalid reset token format',
      'string.pattern.base': 'Invalid reset token format',
    }),
  password: passwordSchema,
}).strict();

// Profile update schema
export const updateProfileSchema = Joi.object({
  name: Joi.string()
    .trim()
    .min(1)
    .max(100)
    .optional()
    .messages({
      'string.min': 'Name must be at least 1 character long',
      'string.max': 'Name must be less than 100 characters long',
    }),
  avatar: Joi.string()
    .uri()
    .max(500)
    .optional()
    .allow('')
    .messages({
      'string.uri': 'Avatar must be a valid URL',
      'string.max': 'Avatar URL must be less than 500 characters long',
    }),
  preferences: Joi.object({
    theme: Joi.string().valid('light', 'dark', 'system').optional(),
    language: Joi.string().length(2).optional(),
    notifications: Joi.object({
      email: Joi.boolean().optional(),
      browser: Joi.boolean().optional(),
      generation: Joi.boolean().optional(),
    }).optional(),
    defaultWebsiteType: Joi.string().max(50).optional(),
    autoSave: Joi.boolean().optional(),
  }).optional(),
}).strict().min(1); // At least one field must be provided

// Refresh token schema
export const refreshTokenSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
    }),
}).strict();

// Change password schema (for authenticated users)
export const changePasswordSchema = Joi.object({
  currentPassword: Joi.string().required().messages({
    'string.empty': 'Current password is required',
  }),
  newPassword: passwordSchema,
}).strict();

// Resend verification schema
export const resendVerificationSchema = Joi.object({
  email: emailSchema,
}).strict();

// Account deletion schema
export const deleteAccountSchema = Joi.object({
  password: Joi.string().required().messages({
    'string.empty': 'Password is required to delete account',
  }),
  confirmation: Joi.string()
    .valid('DELETE')
    .required()
    .messages({
      'any.only': 'Please type "DELETE" to confirm account deletion',
    }),
}).strict();

// Login with remember me option
export const loginWithRememberSchema = Joi.object({
  email: emailSchema,
  password: Joi.string().required().messages({
    'string.empty': 'Password is required',
  }),
  rememberMe: Joi.boolean().optional().default(false),
}).strict();

// Two-factor authentication setup (for future implementation)
export const twoFactorSetupSchema = Joi.object({
  secret: Joi.string().required(),
  token: Joi.string().length(6).pattern(/^\d+$/).required().messages({
    'string.length': '2FA token must be 6 digits',
    'string.pattern.base': '2FA token must contain only numbers',
  }),
}).strict();

// Add this logout schema (it's missing!)
export const logoutSchema = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'Refresh token is required',
    }),
}).strict();

// Validation helper functions
export const validateEmail = (email: string): { valid: boolean; error?: string } => {
  const { error } = emailSchema.validate(email);
  return {
    valid: !error,
    error: error?.message,
  };
};

export const validatePassword = (password: string): { valid: boolean; errors: string[] } => {
  const { error } = passwordSchema.validate(password);
  if (!error) {
    return { valid: true, errors: [] };
  }
  
  return {
    valid: false,
    errors: error.details.map(detail => detail.message),
  };
};

export const validateName = (name: string): { valid: boolean; error?: string } => {
  const { error } = nameSchema.validate(name);
  return {
    valid: !error,
    error: error?.message,
  };
};

// Schema validation middleware factory
export const createValidationMiddleware = (schema: Joi.ObjectSchema) => {
  return (req: any, res: any, next: any) => {
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

      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Request validation failed',
          details,
        },
      });
    }

    req.body = value;
    next();
  };
};




// Add this at the very end of the file
export const authSchemas = {
  register: registerSchema,
  login: loginSchema,
  verifyEmail: verifyEmailSchema,
  resetPasswordRequest: passwordResetRequestSchema,
  resetPassword: passwordResetSchema,
  logout: logoutSchema,
  updateProfile: updateProfileSchema,
  refreshToken: refreshTokenSchema,
  changePassword: changePasswordSchema,
  resendVerification: resendVerificationSchema,
  deleteAccount: deleteAccountSchema
};

export default authSchemas;