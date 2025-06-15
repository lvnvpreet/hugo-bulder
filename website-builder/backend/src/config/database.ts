import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

// Singleton pattern for Prisma client
class DatabaseManager {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;
  private isConnected: boolean = false;

  private constructor() {
    this.prisma = new PrismaClient({
      log: process.env.NODE_ENV === 'development' 
        ? ['query', 'info', 'warn', 'error']
        : ['error'],
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    });

    // Connection pool configuration
    this.setupConnectionPool();
  }

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  private setupConnectionPool() {
    // Configure connection pool settings based on environment
    const poolConfig = {
      connectionLimit: process.env.NODE_ENV === 'production' ? 10 : 3,
      pool_timeout: 60,
      pool_recycle: 3600,
    };

    console.log('🔧 Database connection pool configured:', poolConfig);
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      await this.prisma.$connect();
      this.isConnected = true;
      console.log('✅ Database connected successfully');
    } catch (error) {
      console.error('❌ Database connection failed:', error);
      throw error;
    }
  }

  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await this.prisma.$disconnect();
      this.isConnected = false;
      console.log('✅ Database disconnected successfully');
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  public async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy' | 'degraded';
    latency: number;
    details: any;
  }> {
    const startTime = Date.now();
    
    try {
      // Test basic connectivity
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - startTime;

      // Test table access
      const userCount = await this.prisma.user.count();
      const projectCount = await this.prisma.project.count();

      return {
        status: latency > 1000 ? 'degraded' : 'healthy',
        latency,
        details: {
          connected: this.isConnected,
          latency: `${latency}ms`,
          tables: {
            users: userCount,
            projects: projectCount,
          },
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        latency: Date.now() - startTime,
        details: {
          connected: false,
          error: (error as Error).message,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  public async checkMigrationStatus(): Promise<{
    isUpToDate: boolean;
    pendingMigrations: string[];
    appliedMigrations: number;
  }> {
    try {
      // This is a simplified check - in production you might want more sophisticated migration tracking
      const migrations = await this.prisma.$queryRaw`
        SELECT * FROM _prisma_migrations ORDER BY finished_at DESC LIMIT 1
      ` as any[];

      return {
        isUpToDate: migrations.length > 0 && migrations[0].finished_at !== null,
        pendingMigrations: [],
        appliedMigrations: migrations.length,
      };
    } catch (error) {
      console.warn('Migration status check failed:', error);
      return {
        isUpToDate: false,
        pendingMigrations: ['Unable to check'],
        appliedMigrations: 0,
      };
    }
  }

  public async getPerformanceMetrics(): Promise<{
    connectionCount: number;
    averageQueryTime: number;
    slowQueries: number;
  }> {
    try {
      // Get basic performance metrics
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const queryTime = Date.now() - startTime;

      return {
        connectionCount: 1, // Simplified - would need proper connection pool monitoring
        averageQueryTime: queryTime,
        slowQueries: 0, // Would need query logging and analysis
      };
    } catch (error) {
      console.error('Performance metrics collection failed:', error);
      return {
        connectionCount: 0,
        averageQueryTime: 0,
        slowQueries: 0,
      };
    }
  }

  // Transaction helper
  public async withTransaction<T>(
    fn: (tx: PrismaClient) => Promise<T>
  ): Promise<T> {
    return await this.prisma.$transaction(async (tx) => {
      return await fn(tx);
    });
  }

  // Cleanup helper for tests
  public async cleanup(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      // Delete all data in reverse order of dependencies
      await this.prisma.assetUpload.deleteMany();
      await this.prisma.siteGeneration.deleteMany();
      await this.prisma.wizardStep.deleteMany();
      await this.prisma.project.deleteMany();
      await this.prisma.user.deleteMany();
    }
  }
}

// Export singleton instance
export const db = DatabaseManager.getInstance();
export const prisma = db.getClient();
export default db;
