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
    console.log('🔐 Auth middleware called for:', req.method, req.url);
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      console.log('❌ No auth token provided');
      res.status(401).json({ 
        success: false, 
        error: {
          code: 'AUTH_TOKEN_REQUIRED',
          message: 'Access token required'
        }
      });
      return;
    }    // Validate token using auth service
    console.log('🔍 Validating token...');
    const user = await authService.validateToken(token);
    
    if (user) {
      console.log('✅ Auth: validated user', user.id);
      // Add user to request object
      req.user = {
        id: user.id,
        email: user.email,
        name: user.name || undefined,
        plan: user.plan,
        emailVerified: true // Default to true for now
      };
      next();
      return;
    }
    
    // Token validation failed
    console.log('❌ Token validation failed');
    res.status(403).json({ 
      success: false, 
      error: {
        code: 'AUTH_TOKEN_INVALID',
        message: 'Invalid or expired token'
      }
    });
    return;

  } catch (error) {
    console.error('Authentication middleware error:', error);
    res.status(500).json({ 
      success: false, 
      error: {
        code: 'AUTH_ERROR',
        message: 'Authentication error'
      }
    });
    return;
  }
};

/**
 * Optional Authentication Middleware (for optional auth routes)
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
      try {
        const user = await authService.validateToken(token);
        if (user) {
          req.user = {
            id: user.id,
            email: user.email,
            name: user.name || undefined,
            plan: user.plan,
            emailVerified: true // Default to true for now
          };
        }
      } catch (authError: any) {
        console.log('Optional auth: Auth service failed:', authError?.message || 'Unknown error');
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
 * Rate limiting middleware for authentication endpoints
 */
export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    error: 'Too many authentication attempts from this IP, please try again later.',
    code: 'AUTH_RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
        message: 'Too many authentication attempts from this IP, please try again later.'
      }
    });
  }
});

// Main auth middleware (alias for authenticateToken)
export const authMiddleware = authenticateToken;
