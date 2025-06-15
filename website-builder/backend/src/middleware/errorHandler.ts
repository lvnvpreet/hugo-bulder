import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';

// Custom error types
export class AppError extends Error {
  public statusCode: number;
  public code: string;
  public isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code: string = 'INTERNAL_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: any) {
    super(message, 400, 'VALIDATION_FAILED');
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTH_FAILED');
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403, 'ACCESS_DENIED');
    this.name = 'AuthorizationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404, 'NOT_FOUND');
    this.name = 'NotFoundError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409, 'CONFLICT');
    this.name = 'ConflictError';
  }
}

export class RateLimitError extends AppError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_EXCEEDED');
    this.name = 'RateLimitError';
  }
}

// Error classification function
function classifyError(error: any): {
  statusCode: number;
  code: string;
  message: string;
  details?: any;
} {
  // Handle known app errors
  if (error instanceof AppError) {
    return {
      statusCode: error.statusCode,
      code: error.code,
      message: error.message,
    };
  }

  // Handle Prisma errors
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    switch (error.code) {
      case 'P2002':
        return {
          statusCode: 409,
          code: 'DUPLICATE_ENTRY',
          message: 'A record with this information already exists',
          details: error.meta,
        };
      case 'P2025':
        return {
          statusCode: 404,
          code: 'NOT_FOUND',
          message: 'Record not found',
        };
      case 'P2003':
        return {
          statusCode: 400,
          code: 'FOREIGN_KEY_CONSTRAINT',
          message: 'Invalid reference to related record',
        };
      case 'P2014':
        return {
          statusCode: 400,
          code: 'INVALID_RELATION',
          message: 'The change would violate a relation constraint',
        };
      default:
        return {
          statusCode: 500,
          code: 'DATABASE_ERROR',
          message: 'Database operation failed',
        };
    }
  }

  // Handle Prisma validation errors
  if (error instanceof Prisma.PrismaClientValidationError) {
    return {
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Invalid data provided',
    };
  }

  // Handle Prisma connection errors
  if (error instanceof Prisma.PrismaClientInitializationError) {
    return {
      statusCode: 503,
      code: 'DATABASE_CONNECTION_ERROR',
      message: 'Unable to connect to database',
    };
  }

  // Handle JSON Web Token errors
  if (error.name === 'JsonWebTokenError') {
    return {
      statusCode: 401,
      code: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
    };
  }

  if (error.name === 'TokenExpiredError') {
    return {
      statusCode: 401,
      code: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
    };
  }

  // Handle Multer file upload errors
  if (error.code === 'LIMIT_FILE_SIZE') {
    return {
      statusCode: 413,
      code: 'FILE_TOO_LARGE',
      message: 'File size exceeds maximum allowed limit',
    };
  }

  if (error.code === 'LIMIT_FILE_COUNT') {
    return {
      statusCode: 413,
      code: 'TOO_MANY_FILES',
      message: 'Too many files uploaded',
    };
  }

  // Handle validation library errors (Joi, Zod, etc.)
  if (error.name === 'ValidationError' && error.details) {
    return {
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: error.details.map((detail: any) => detail.message).join(', '),
      details: error.details,
    };
  }

  // Handle CORS errors
  if (error.message && error.message.includes('CORS')) {
    return {
      statusCode: 403,
      code: 'CORS_ERROR',
      message: 'Cross-origin request blocked',
    };
  }

  // Handle syntax errors
  if (error instanceof SyntaxError) {
    return {
      statusCode: 400,
      code: 'SYNTAX_ERROR',
      message: 'Invalid request format',
    };
  }

  // Default error
  return {
    statusCode: 500,
    code: 'INTERNAL_ERROR',
    message: process.env.NODE_ENV === 'production' 
      ? 'An unexpected error occurred' 
      : error.message || 'Unknown error',
  };
}

// Log error function
function logError(error: any, req: Request): void {
  const errorInfo = {
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.url,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    userId: (req as any).user?.id,
    error: {
      name: error.name,
      message: error.message,
      stack: error.stack,
      code: error.code,
    },
  };

  if (process.env.NODE_ENV === 'development') {
    console.error('🚨 Error occurred:', JSON.stringify(errorInfo, null, 2));
  } else {
    console.error('🚨 Error occurred:', JSON.stringify(errorInfo));
  }

  // In production, you might want to send this to a logging service
  // like Winston, LogRocket, Sentry, etc.
}

// Main error handler middleware
export const errorHandler = (
  error: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log the error
  logError(error, req);

  // Classify and format the error
  const { statusCode, code, message, details } = classifyError(error);

  // Send error response
  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message,
      ...(details && { details }),
      ...(process.env.NODE_ENV === 'development' && {
        stack: error.stack,
        originalError: error.message,
      }),
    },
    meta: {
      timestamp: new Date().toISOString(),
      requestId: req.headers['x-request-id'] || 'unknown',
    },
  });
};

// Async error handler wrapper
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

// Create specific error functions for common use cases
export const createValidationError = (message: string, details?: any) => {
  return new ValidationError(message);
};

export const createNotFoundError = (resource: string) => {
  return new NotFoundError(resource);
};

export const createAuthenticationError = (message?: string) => {
  return new AuthenticationError(message);
};

export const createAuthorizationError = (message?: string) => {
  return new AuthorizationError(message);
};

export const createConflictError = (message: string) => {
  return new ConflictError(message);
};

export default errorHandler;