import app from './app';
import { config } from 'dotenv';
import { PrismaClient } from '@prisma/client';

// Load environment variables
config();

// Database client
const prisma = new PrismaClient();

// Environment variable validation
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  process.exit(1);
}

// Port configuration
const PORT = parseInt(process.env.PORT || '3001', 10);
const HOST = process.env.HOST || '0.0.0.0';

// Server instance
let server: any;

// Database connection and health check
async function connectToDatabase() {
  try {
    console.log('🔗 Connecting to database...');
    
    // Test database connection
    await prisma.$connect();
    console.log('✅ Database connected successfully');
    
    // Check if database is properly migrated
    try {
      // Simple query to test database structure
      await prisma.user.findFirst();
      console.log('✅ Database schema validated');
    } catch (error) {
      console.warn('⚠️  Database schema may need migration:', (error as Error).message);
    }
    
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    throw error;
  }
}

// Server startup
async function startServer() {
  try {
    // Connect to database first
    await connectToDatabase();
    
    // Start HTTP server
    server = app.listen(PORT, HOST, () => {
      console.log('\n🚀 Server Configuration:');
      console.log(`   ├─ Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`   ├─ Host: ${HOST}`);
      console.log(`   ├─ Port: ${PORT}`);
      console.log(`   ├─ Database: Connected`);
      console.log(`   └─ API Base: http://${HOST}:${PORT}/api`);      console.log('\n📚 Available Endpoints:');
      console.log(`   ├─ Health Check: http://${HOST}:${PORT}/health`);
      console.log(`   ├─ API Overview: http://${HOST}:${PORT}/api/docs`);
      console.log(`   ├─ Swagger UI: http://${HOST}:${PORT}/api/docs`);
      console.log(`   ├─ OpenAPI Spec: http://${HOST}:${PORT}/api/docs.json`);
      console.log(`   ├─ Auth: http://${HOST}:${PORT}/api/auth`);
      console.log(`   ├─ Projects: http://${HOST}:${PORT}/api/projects`);
      console.log(`   ├─ Assets: http://${HOST}:${PORT}/api/assets`);
      console.log(`   ├─ Reference: http://${HOST}:${PORT}/api/reference`);
      console.log(`   ├─ Generations: http://${HOST}:${PORT}/api/generations`);
      console.log(`   ├─ Webhooks: http://${HOST}:${PORT}/api/webhooks`);
      console.log(`   └─ AI Services: http://${HOST}:${PORT}/api/ai`);
      console.log('\n✅ Server is running and ready to accept connections!\n');
    });

    // Server error handling
    server.on('error', (error: NodeJS.ErrnoException) => {
      if (error.syscall !== 'listen') {
        throw error;
      }

      const bind = typeof PORT === 'string' ? 'Pipe ' + PORT : 'Port ' + PORT;

      switch (error.code) {
        case 'EACCES':
          console.error(`❌ ${bind} requires elevated privileges`);
          process.exit(1);
          break;
        case 'EADDRINUSE':
          console.error(`❌ ${bind} is already in use`);
          process.exit(1);
          break;
        default:
          throw error;
      }
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Graceful shutdown handling
async function gracefulShutdown(signal: string) {
  console.log(`\n📝 Received ${signal}. Starting graceful shutdown...`);
  
  const shutdownTimeout = setTimeout(() => {
    console.error('❌ Graceful shutdown timeout, forcing exit');
    process.exit(1);
  }, 30000); // 30 second timeout

  try {
    if (server) {
      console.log('🔄 Closing HTTP server...');
      server.close(() => {
        console.log('✅ HTTP server closed');
      });
    }

    console.log('🔄 Closing database connections...');
    await prisma.$disconnect();
    console.log('✅ Database connections closed');

    clearTimeout(shutdownTimeout);
    console.log('✅ Graceful shutdown completed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during graceful shutdown:', error);
    clearTimeout(shutdownTimeout);
    process.exit(1);
  }
}

// Process signal handling
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// Uncaught exception handling
process.on('uncaughtException', (error) => {
  console.error('❌ Uncaught Exception:', error);
  console.error('Stack:', error.stack);
  
  // Perform graceful shutdown
  gracefulShutdown('uncaughtException').finally(() => {
    process.exit(1);
  });
});

// Unhandled promise rejection handling
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  
  // Perform graceful shutdown
  gracefulShutdown('unhandledRejection').finally(() => {
    process.exit(1);
  });
});

// Start the server
startServer().catch((error) => {
  console.error('❌ Server startup failed:', error);
  process.exit(1);
});

// Export for testing
export { app, prisma };