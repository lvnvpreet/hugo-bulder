import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Request, Response } from 'express';

// Rate limiting configuration by endpoint type
export const rateLimitConfig = {
  // Global API rate limit
  global: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 1000, // requests per window
    message: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },

  // Authentication endpoints
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 10, // requests per window
    message: 'Too many authentication attempts, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },

  // Password reset
  passwordReset: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 3, // requests per window
    message: 'Too many password reset attempts, please try again later.',
    code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED'
  },

  // Email verification
  emailVerification: {
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 5, // requests per window
    message: 'Too many verification emails sent, please try again later.',
    code: 'EMAIL_VERIFICATION_RATE_LIMIT_EXCEEDED'
  },

  // Project operations
  projects: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 50, // requests per window for authenticated users
    message: 'Too many project operations, please try again later.',
    code: 'PROJECT_RATE_LIMIT_EXCEEDED'
  },

  // File uploads
  uploads: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 20, // requests per window
    message: 'Too many file uploads, please try again later.',
    code: 'UPLOAD_RATE_LIMIT_EXCEEDED'
  },

  // Website generation
  generation: {
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 5, // requests per window (expensive operation)
    message: 'Too many generation requests, please try again later.',
    code: 'GENERATION_RATE_LIMIT_EXCEEDED'
  },

  // API documentation and health checks
  public: {
    windowMs: 5 * 60 * 1000, // 5 minutes
    max: 100, // requests per window
    message: 'Too many requests, please try again later.',
    code: 'PUBLIC_RATE_LIMIT_EXCEEDED'
  }
};

// Create rate limiter factory
const createRateLimiter = (config: typeof rateLimitConfig.global) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      error: {
        code: config.code,
        message: config.message
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: config.code,
          message: config.message,
          retryAfter: Math.round(config.windowMs / 1000) // seconds
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        }
      });
    },
    skip: (req: Request) => {
      // Skip rate limiting for premium users on certain endpoints
      const user = (req as any).user;
      if (user && user.plan === 'premium' && 
          (config.code === 'PROJECT_RATE_LIMIT_EXCEEDED' || 
           config.code === 'GENERATION_RATE_LIMIT_EXCEEDED')) {
        return true;
      }
      return false;
    }
  });
};

// User-specific rate limiting (requires authentication)
const createUserRateLimiter = (config: typeof rateLimitConfig.global) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    message: {
      success: false,
      error: {
        code: config.code,
        message: config.message
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req: Request) => {
      // Use user ID if authenticated, otherwise fall back to IP
      const user = (req as any).user;
      return user ? `user:${user.id}` : req.ip;
    },
    handler: (req: Request, res: Response) => {
      res.status(429).json({
        success: false,
        error: {
          code: config.code,
          message: config.message,
          retryAfter: Math.round(config.windowMs / 1000)
        },
        meta: {
          timestamp: new Date().toISOString(),
          requestId: req.headers['x-request-id'] || 'unknown',
        }
      });
    }
  });
};

// Speed limiting (adds delay instead of blocking)
export const createSpeedLimiter = (config: {
  windowMs: number;
  delayAfter: number;
  delayMs: number;
  maxDelayMs: number;
}) => {
  return slowDown({
    windowMs: config.windowMs,
    delayAfter: config.delayAfter,
    delayMs: () => config.delayMs,
    maxDelayMs: config.maxDelayMs,
    // headers: true,
  });
};

// Export configured rate limiters
export const globalRateLimit = createRateLimiter(rateLimitConfig.global);
export const authRateLimit = createRateLimiter(rateLimitConfig.auth);
export const passwordResetRateLimit = createRateLimiter(rateLimitConfig.passwordReset);
export const emailVerificationRateLimit = createRateLimiter(rateLimitConfig.emailVerification);
export const projectRateLimit = createUserRateLimiter(rateLimitConfig.projects);
export const uploadRateLimit = createUserRateLimiter(rateLimitConfig.uploads);
export const generationRateLimit = createUserRateLimiter(rateLimitConfig.generation);
export const publicRateLimit = createRateLimiter(rateLimitConfig.public);

// Global speed limiter
export const globalSpeedLimit = createSpeedLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 500, // Allow 500 requests per window without delay
  delayMs: 50, // Add 50ms delay per request after delayAfter
  maxDelayMs: 2000, // Maximum delay of 2 seconds
});

// Plan-based rate limiting
export const planBasedRateLimit = (limits: {
  free: number;
  pro: number;
  premium: number;
}) => {
  return rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: (req: Request) => {
      const user = (req as any).user;
      if (!user) return limits.free;
      
      switch (user.plan) {
        case 'premium':
          return limits.premium;
        case 'pro':
          return limits.pro;
        default:
          return limits.free;
      }
    },
    keyGenerator: (req: Request) => {
      const user = (req as any).user;
      return user ? `user:${user.id}:plan:${user.plan}` : req.ip;
    },
    message: {
      success: false,
      error: {
        code: 'PLAN_RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded for your plan. Consider upgrading for higher limits.'
      }
    },
    standardHeaders: true,
    legacyHeaders: false,
  });
};

// Export the main rate limiting middleware
export const rateLimitMiddleware = globalRateLimit;
export default rateLimitMiddleware;
