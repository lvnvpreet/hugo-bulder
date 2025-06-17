import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import multer from 'multer';
import swaggerUi from 'swagger-ui-express';
import { config } from 'dotenv';

// Load environment variables
config();

// Import middleware
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFound';
import { authMiddleware } from './middleware/auth';
import { validationMiddleware } from './middleware/validation';
import { rateLimitMiddleware } from './middleware/rateLimit';

// Import routes
import authRoutes from './routes/auth';
import projectRoutes from './routes/projects';
import aiRoutes from './routes/ai';
import assetRoutes from './routes/assets';
import referenceRoutes from './routes/reference';
import generationRoutes from './routes/generations';
import webhookRoutes from './routes/webhooks';

// Import swagger configuration
import { swaggerSpec } from './config/swagger';

const app = express();

// Trust proxy for rate limiting and IP detection
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
}));

// CORS configuration with enhanced local development support
const corsOptions = {
  origin: function (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) {
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
      'http://localhost:3000',
      'http://localhost:5173', // Vite default dev server
      'http://localhost:4173', // Vite preview server
      'http://127.0.0.1:3000',
      'http://127.0.0.1:5173',
      'http://127.0.0.1:4173'
    ];
    
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS: Allowing origin ${origin}`);
      callback(null, true);
    } else {
      console.warn(`❌ CORS: Blocking origin ${origin}`);
      console.log(`Allowed origins: ${allowedOrigins.join(', ')}`);
      callback(new Error(`CORS policy violation: Origin ${origin} is not allowed`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'X-Requested-With',
    'X-Request-ID',
    'Accept',
    'Origin',
    'Cache-Control'
  ],
  exposedHeaders: ['X-Request-ID', 'X-Total-Count'],
  maxAge: 86400, // 24 hours preflight cache
  optionsSuccessStatus: 200 // For legacy browser support
};

app.use(cors(corsOptions));

// Compression middleware
app.use(compression({
  level: 6,
  threshold: 1024,
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  }
}));

// Request logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Body parsing middleware
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: ['application/json', 'application/json; charset=utf-8']
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 50
}));

// Rate limiting middleware
const globalRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // Limit each IP to 1000 requests per windowMs
  message: {
    error: 'Too many requests from this IP, please try again later.',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Too many requests from this IP, please try again later.'
      }
    });
  }
});

app.use(globalRateLimit);

// Speed limiting middleware
const speedLimiter = slowDown({
  windowMs: 15 * 60 * 1000, // 15 minutes
  delayAfter: 500, // Allow 500 requests per windowMs without delay
  delayMs: () => 50, // ← Changed to function that returns 50ms
  maxDelayMs: 2000, // Maximum delay of 2 seconds
});

app.use(speedLimiter);

// File upload configuration
const upload = multer({
  dest: process.env.UPLOAD_DIR || './uploads',
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
    files: 10,
    fields: 20
  },
  fileFilter: (req, file, cb) => {
    // Allow common file types
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml',
      'application/pdf',
      'text/plain',
      'application/json'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    version: process.env.npm_package_version || '1.0.0',
    services: {
      database: 'connected', // You can add actual DB health check here
      memory: {
        used: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
        total: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
      }
    }
  });
});

// Service status endpoint for frontend monitoring
app.get('/api/status', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      backend: {
        status: 'online',
        port: process.env.PORT || 3001,
        uptime: process.uptime()
      },
      aiEngine: {
        url: process.env.AI_ENGINE_URL || 'http://localhost:3002',
        status: 'unknown' // Frontend will check this separately
      },
      hugoGenerator: {
        url: process.env.HUGO_GENERATOR_URL || 'http://localhost:3003',
        status: 'unknown' // Frontend will check this separately
      }
    }
  });
});

// Swagger documentation setup
if (process.env.NODE_ENV === 'development') {
  app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Website Builder API Documentation',
    swaggerOptions: {
      persistAuthorization: true,
      displayRequestDuration: true,
      filter: true,
      showExtensions: true,
      showCommonExtensions: true
    }
  }));
  
  // Swagger JSON endpoint
  app.get('/api/docs.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });
}

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', authMiddleware, projectRoutes);
app.use('/api/assets', authMiddleware, assetRoutes);
app.use('/api/reference', authMiddleware, referenceRoutes);
app.use('/api/generations', authMiddleware, generationRoutes);
app.use('/api/webhooks', authMiddleware, webhookRoutes);
app.use('/api/ai', authMiddleware, aiRoutes);

// API documentation route
/**
 * @swagger
 * /api/docs:
 *   get:
 *     summary: API documentation overview
 *     description: Returns an overview of available API endpoints and documentation links
 *     tags: [System]
 *     security: []
 *     responses:
 *       200:
 *         description: API documentation overview
 *         content:
 *           application/json:
 *             schema:
 *               allOf:
 *                 - $ref: '#/components/schemas/ApiResponse'
 *                 - type: object
 *                   properties:
 *                     data:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: Website Builder API
 *                         version:
 *                           type: string
 *                           example: 1.0.0
 *                         description:
 *                           type: string
 *                         endpoints:
 *                           type: object
 *                           additionalProperties:
 *                             type: string
 *                         documentation:
 *                           type: string
 *                           format: uri
 */
app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    data: {
      title: 'Website Builder API',
      version: '1.0.0',
      description: 'API for AI-powered website builder',      endpoints: {
        auth: '/api/auth',
        projects: '/api/projects',
        assets: '/api/assets',
        reference: '/api/reference',
        generations: '/api/generations',
        webhooks: '/api/webhooks',
        ai: '/api/ai',
        health: '/health'
      },
      documentation: process.env.NODE_ENV === 'development' ? '/api/docs/swagger' : undefined
    }
  });
});

// Error handling middleware (must be last)
app.use(notFoundHandler);
app.use(errorHandler);

export default app;