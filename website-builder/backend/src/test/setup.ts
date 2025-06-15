import { beforeAll, afterAll } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load test environment variables
config({ path: '.env.test' });

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL || 'postgresql://test:test@localhost:5432/website_builder_test'
    }
  }
});

beforeAll(async () => {
  // Ensure test database connection
  await prisma.$connect();
  
  // Run any necessary database migrations or setup
  console.log('Test database connected');
});

afterAll(async () => {
  // Clean up test database connections
  await prisma.$disconnect();
  console.log('Test database disconnected');
});

// Global test utilities
global.testPrisma = prisma;

export { prisma };
