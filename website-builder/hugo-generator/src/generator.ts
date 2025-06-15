import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import compression from 'compression';
import { config } from 'dotenv';
import * as path from 'path';

import generationRoutes from './routes/generation';
import { HugoSiteBuilder } from './services/HugoSiteBuilder';
import { FileManager } from './utils/FileManager';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3003;

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Ensure required directories exist
const ensureDirectories = async () => {
  const fileManager = new FileManager();
  const dirs = [
    path.join(process.cwd(), 'output'),
    path.join(process.cwd(), 'packages'),
    path.join(process.cwd(), 'temp', 'themes')
  ];
  
  for (const dir of dirs) {
    await fileManager.ensureDir(dir);
  }
};

// Routes
app.use('/api/generation', generationRoutes);

// Serve static files from packages directory for downloads
app.use('/packages', express.static(path.join(process.cwd(), 'packages')));

// Health check endpoint
app.get('/health', async (req: Request, res: Response) => {
  try {
    const hugoBuilder = new HugoSiteBuilder();
    const health = await hugoBuilder.healthCheck();
    
    res.json({
      status: 'healthy',
      service: 'hugo-generator',
      timestamp: new Date().toISOString(),
      version: process.env.npm_package_version || '1.0.0',
      ...health
    });
  } catch (error: any) {
    res.status(500).json({
      status: 'unhealthy',
      service: 'hugo-generator',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    service: 'Hugo Site Generator',
    version: process.env.npm_package_version || '1.0.0',
    endpoints: {
      health: '/health',
      generate: 'POST /api/generation/generate',
      download: 'GET /api/generation/download/:filename',
      themes: 'GET /api/generation/themes',
      status: 'GET /api/generation/status/:buildId'
    },
    documentation: 'https://docs.example.com/hugo-generator'
  });
});

// Error handling middleware
app.use((error: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', error);
  
  res.status(error.status || 500).json({
    success: false,
    error: error.message || 'Internal Server Error',
    timestamp: new Date().toISOString(),
    path: req.path
  });
});

// 404 handler
app.use('*', (req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint not found',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/generation/generate',
      'GET /api/generation/download/:filename',
      'GET /api/generation/themes'
    ]
  });
});

// Start server
const startServer = async () => {
  try {
    // Ensure required directories exist
    await ensureDirectories();
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Hugo Generator Service running on port ${PORT}`);
      console.log(`📁 Output directory: ${path.join(process.cwd(), 'output')}`);
      console.log(`📦 Packages directory: ${path.join(process.cwd(), 'packages')}`);
      console.log(`🌐 Health check: http://localhost:${PORT}/health`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      console.log(`\n${signal} received. Shutting down gracefully...`);
      
      server.close(() => {
        console.log('Hugo Generator Service stopped');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    
  } catch (error) {
    console.error('Failed to start Hugo Generator Service:', error);
    process.exit(1);
  }
};

// Start the server
startServer().catch(console.error);

export default app;