import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { AuthService } from '../services/auth';

// Extend Express Request interface to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        name?: string;
        plan: string;
        emailVerified: boolean;
      };
    }
  }
}

const authService = new AuthService();

/**
 * JWT Authentication Middleware
 */
export const authenticateToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      res.status(401).json({ 
        success: false, 
        error: {
          code: 'AUTH_TOKEN_REQUIRED',
          message: 'Access token required'
        }
      });
      return;
    }

    const user = await authService.validateToken(token);
    
    if (!user) {
      res.status(403).json({ 
        success: false, 
        error: {
          code: 'AUTH_TOKEN_INVALID',
          message: 'Invalid or expired token'
        }
      });
      return;
    }

    // Add user to request object
    req.user = {
      id: user.id,
      email: user.email,
      name: user.name || undefined,
      plan: user.plan,
      emailVerified: user.emailVerified
    };

    next();
  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error'
      }
    });
  }
};

/**
 * Optional Authentication Middleware
 * Adds user info to request if token is present, but doesn't require it
 */
export const optionalAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (token) {
      const user = await authService.validateToken(token);
      if (user) {
        req.user = {
          id: user.id,
          email: user.email,
          name: user.name || undefined,
          plan: user.plan,
          emailVerified: user.emailVerified
        };
      }
    }

    next();
  } catch (error) {
    console.error('Optional auth middleware error:', error);
    next(); // Continue even if there's an error
  }
};

/**
 * Role-based Authorization Middleware
 */
export const requirePlan = (allowedPlans: string[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ 
        success: false, 
        message: 'Authentication required' 
      });
      return;
    }

    if (!allowedPlans.includes(req.user.plan)) {
      res.status(403).json({ 
        success: false, 
        message: `This feature requires a ${allowedPlans.join(' or ')} plan` 
      });
      return;
    }

    next();
  };
};

/**
 * Email Verification Required Middleware
 */
export const requireEmailVerification = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    res.status(401).json({ 
      success: false, 
      message: 'Authentication required' 
    });
    return;
  }

  if (!req.user.emailVerified) {
    res.status(403).json({ 
      success: false, 
      message: 'Email verification required' 
    });
    return;
  }

  next();
};

/**
 * Rate Limiting for Authentication Endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    success: false,
    message: 'Too many authentication attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiting for Password Reset
 */
export const passwordResetRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    success: false,
    message: 'Too many password reset attempts, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Rate Limiting for Email Verification
 */
export const emailVerificationRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 3, // limit each IP to 3 verification emails per 10 minutes
  message: {
    success: false,
    message: 'Too many verification emails sent, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * General API Rate Limiting
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    message: 'Too many requests, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Project Creation Rate Limiting
 */
export const projectRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // limit each IP to 10 project operations per hour
  message: {
    success: false,
    message: 'Project limit reached, please try again later'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Export the main authentication middleware as default
export const authMiddleware = authenticateToken;
export default authMiddleware;
