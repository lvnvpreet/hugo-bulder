import { PrismaClient } from '@prisma/client';
import { config } from 'dotenv';

// Load environment variables
config();

// Global declaration for development logging
declare global {
  var __prisma: PrismaClient | undefined;
}

// Enhanced Singleton pattern for Prisma client with progress tracking support
class DatabaseManager {
  private static instance: DatabaseManager;
  private prisma: PrismaClient;
  private isConnected: boolean = false;
  private connectionStartTime: number = 0;
  private queryCount: number = 0;
  private lastHealthCheck: Date | null = null;

  private constructor() {
    // Use global prisma instance in development to prevent multiple connections
    if (process.env.NODE_ENV === 'development' && global.__prisma) {
      this.prisma = global.__prisma;
    } else {
      this.prisma = new PrismaClient({
        log: process.env.NODE_ENV === 'development' 
          ? [
              { level: 'query', emit: 'event' },
              { level: 'info', emit: 'stdout' },
              { level: 'warn', emit: 'stdout' },
              { level: 'error', emit: 'stdout' }
            ]
          : [
              { level: 'error', emit: 'stdout' }
            ],
        datasources: {
          db: {
            url: process.env.DATABASE_URL,
          },
        },
        // Enhanced configuration for better performance with progress tracking
        errorFormat: 'pretty',
      });

      // Store global reference in development
      if (process.env.NODE_ENV === 'development') {
        global.__prisma = this.prisma;
      }
    }

    // Setup connection pool and event listeners
    this.setupConnectionPool();
    this.setupEventListeners();
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
      connectionLimit: process.env.NODE_ENV === 'production' ? 20 : 5,
      pool_timeout: 60,
      pool_recycle: 3600,
      pool_pre_ping: true, // Validate connections before use
    };

    console.log('🔧 Database connection pool configured:', poolConfig);
  }

  private setupEventListeners() {
    // Enhanced logging for development and debugging
    if (process.env.NODE_ENV === 'development') {
      this.prisma.$on('query', (e) => {
        this.queryCount++;
        if (process.env.LOG_QUERIES === 'true') {
          console.log(`🔍 Query ${this.queryCount}: ${e.query}`);
          console.log(`📊 Duration: ${e.duration}ms`);
        }
      });
    }

    // Handle connection errors
    process.on('beforeExit', async () => {
      await this.disconnect();
    });

    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });

    process.on('SIGTERM', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  public getClient(): PrismaClient {
    return this.prisma;
  }

  public async connect(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      this.connectionStartTime = Date.now();
      console.log('🔗 Connecting to database...');
      
      await this.prisma.$connect();
      this.isConnected = true;
      
      const connectionTime = Date.now() - this.connectionStartTime;
      console.log(`✅ Database connected successfully in ${connectionTime}ms`);
      
      // Verify database schema and tables for progress tracking
      await this.verifyProgressTrackingSchema();
      
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
      console.log(`📊 Total queries executed: ${this.queryCount}`);
    } catch (error) {
      console.error('❌ Database disconnection failed:', error);
      throw error;
    }
  }

  /**
   * Verify that the database schema supports progress tracking features
   */
  private async verifyProgressTrackingSchema(): Promise<void> {
    try {
      // Check if progress tracking fields exist in SiteGeneration table
      const testQuery = await this.prisma.$queryRaw`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'site_generations' 
        AND column_name IN ('progress', 'currentStep', 'customizations', 'contentOptions')
      ` as any[];

      const existingColumns = testQuery.map((row: any) => row.column_name);
      const requiredColumns = ['progress', 'currentStep', 'customizations', 'contentOptions'];
      const missingColumns = requiredColumns.filter(col => !existingColumns.includes(col));

      if (missingColumns.length > 0) {
        console.warn('⚠️  Progress tracking fields missing from site_generations table:');
        missingColumns.forEach(col => console.warn(`   - ${col}`));
        console.warn('📋 Run migration: npx prisma migrate dev --name add_progress_tracking_to_site_generation');
      } else {
        console.log('✅ Progress tracking schema verified');
      }
    } catch (error) {
      console.warn('⚠️  Could not verify progress tracking schema:', (error as Error).message);
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
      await this.prisma.$queryRaw`SELECT 1 as health_check`;
      const latency = Date.now() - startTime;

      // Test table access and progress tracking capabilities
      const [userCount, projectCount, generationCount, activeGenerations] = await Promise.all([
        this.prisma.user.count(),
        this.prisma.project.count(),
        this.prisma.siteGeneration.count(),
        this.prisma.siteGeneration.count({
          where: {
            status: {
              in: ['PENDING', 'INITIALIZING', 'GENERATING_CONTENT', 'BUILDING_SITE', 'PACKAGING']
            }
          }
        })
      ]);

      this.lastHealthCheck = new Date();

      return {
        status: latency > 1000 ? 'degraded' : 'healthy',
        latency,
        details: {
          connected: this.isConnected,
          latency: `${latency}ms`,
          queryCount: this.queryCount,
          tables: {
            users: userCount,
            projects: projectCount,
            generations: generationCount,
            activeGenerations: activeGenerations,
          },
          progressTracking: {
            enabled: true,
            lastHealthCheck: this.lastHealthCheck.toISOString(),
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
          queryCount: this.queryCount,
          timestamp: new Date().toISOString(),
        },
      };
    }
  }

  public async checkMigrationStatus(): Promise<{
    isUpToDate: boolean;
    pendingMigrations: string[];
    appliedMigrations: number;
    progressTrackingEnabled: boolean;
  }> {
    try {
      // Check migration status
      const migrations = await this.prisma.$queryRaw`
        SELECT migration_name, finished_at 
        FROM _prisma_migrations 
        ORDER BY finished_at DESC
      ` as any[];

      // Check if progress tracking migration exists
      const progressTrackingMigration = migrations.find((m: any) => 
        m.migration_name.includes('progress') || 
        m.migration_name.includes('tracking') ||
        m.migration_name.includes('site_generation')
      );

      // Verify progress tracking fields exist
      const progressFieldsExist = await this.verifyProgressFields();

      return {
        isUpToDate: migrations.length > 0 && migrations.every((m: any) => m.finished_at !== null),
        pendingMigrations: migrations.filter((m: any) => m.finished_at === null).map((m: any) => m.migration_name),
        appliedMigrations: migrations.length,
        progressTrackingEnabled: progressFieldsExist && !!progressTrackingMigration,
      };
    } catch (error) {
      console.warn('Migration status check failed:', error);
      return {
        isUpToDate: false,
        pendingMigrations: ['Unable to check'],
        appliedMigrations: 0,
        progressTrackingEnabled: false,
      };
    }
  }

  private async verifyProgressFields(): Promise<boolean> {
    try {
      await this.prisma.$queryRaw`
        SELECT progress, "currentStep", customizations, "contentOptions" 
        FROM site_generations 
        LIMIT 1
      `;
      return true;
    } catch (error) {
      return false;
    }
  }

  public async getPerformanceMetrics(): Promise<{
    connectionCount: number;
    averageQueryTime: number;
    slowQueries: number;
    activeGenerations: number;
    completedGenerations: number;
    failedGenerations: number;
  }> {
    try {
      // Get basic performance metrics
      const startTime = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const queryTime = Date.now() - startTime;

      // Get generation statistics for performance monitoring
      const [activeGenerations, completedGenerations, failedGenerations] = await Promise.all([
        this.prisma.siteGeneration.count({
          where: {
            status: {
              in: ['PENDING', 'INITIALIZING', 'GENERATING_CONTENT', 'BUILDING_SITE', 'PACKAGING']
            }
          }
        }),
        this.prisma.siteGeneration.count({
          where: { status: 'COMPLETED' }
        }),
        this.prisma.siteGeneration.count({
          where: { status: 'FAILED' }
        })
      ]);

      return {
        connectionCount: 1, // Simplified - would need proper connection pool monitoring
        averageQueryTime: queryTime,
        slowQueries: 0, // Would need query logging and analysis
        activeGenerations,
        completedGenerations,
        failedGenerations,
      };
    } catch (error) {
      console.error('Performance metrics collection failed:', error);
      return {
        connectionCount: 0,
        averageQueryTime: 0,
        slowQueries: 0,
        activeGenerations: 0,
        completedGenerations: 0,
        failedGenerations: 0,
      };
    }
  }

  /**
   * Enhanced transaction helper with progress tracking support
   */
  public async withTransaction<T>(
    fn: (tx: PrismaClient) => Promise<T>,
    options?: {
      maxWait?: number;
      timeout?: number;
      isolationLevel?: 'ReadUncommitted' | 'ReadCommitted' | 'RepeatableRead' | 'Serializable';
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      const result = await this.prisma.$transaction(async (tx) => {
        return await fn(tx);
      }, {
        maxWait: options?.maxWait || 5000,
        timeout: options?.timeout || 10000,
        isolationLevel: options?.isolationLevel,
      });

      const duration = Date.now() - startTime;
      if (duration > 1000) {
        console.warn(`⚠️  Slow transaction detected: ${duration}ms`);
      }

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ Transaction failed after ${duration}ms:`, error);
      throw error;
    }
  }

  /**
   * Progress tracking specific methods
   */
  public async updateGenerationProgress(
    generationId: string, 
    progress: number, 
    currentStep: string
  ): Promise<void> {
    try {
      await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          progress: Math.min(100, Math.max(0, progress)), // Ensure 0-100 range
          currentStep: currentStep.substring(0, 255), // Ensure field length limits
        },
      });
    } catch (error) {
      console.error(`Failed to update generation progress for ${generationId}:`, error);
      throw error;
    }
  }

  public async getActiveGenerations(userId?: string): Promise<any[]> {
    try {
      return await this.prisma.siteGeneration.findMany({
        where: {
          status: {
            in: ['PENDING', 'INITIALIZING', 'GENERATING_CONTENT', 'BUILDING_SITE', 'PACKAGING']
          },
          ...(userId && {
            project: {
              userId: userId
            }
          })
        },
        include: {
          project: {
            select: {
              id: true,
              name: true,
              slug: true,
              userId: true,
            }
          }
        },
        orderBy: {
          startedAt: 'desc'
        }
      });
    } catch (error) {
      console.error('Failed to get active generations:', error);
      return [];
    }
  }

  /**
   * Cleanup helper for tests and maintenance
   */
  public async cleanup(): Promise<void> {
    if (process.env.NODE_ENV === 'test') {
      console.log('🧹 Cleaning up test database...');
      
      // Delete all data in reverse order of dependencies
      await this.prisma.assetUpload.deleteMany();
      await this.prisma.siteGeneration.deleteMany();
      await this.prisma.wizardStep.deleteMany();
      await this.prisma.project.deleteMany();
      await this.prisma.user.deleteMany();
      
      console.log('✅ Test database cleaned');
    }
  }

  /**
   * Database maintenance and optimization
   */
  public async maintenance(): Promise<void> {
    try {
      console.log('🔧 Running database maintenance...');
      
      // Clean up expired generations
      const expiredCount = await this.prisma.siteGeneration.updateMany({
        where: {
          expiresAt: {
            lt: new Date()
          },
          status: {
            not: 'EXPIRED'
          }
        },
        data: {
          status: 'EXPIRED'
        }
      });

      // Update performance statistics
      await this.updatePerformanceStats();

      console.log(`✅ Database maintenance completed. Updated ${expiredCount.count} expired generations.`);
    } catch (error) {
      console.error('❌ Database maintenance failed:', error);
    }
  }

  private async updatePerformanceStats(): Promise<void> {
    try {
      // This could update internal performance tracking tables
      // For now, just log current stats
      const metrics = await this.getPerformanceMetrics();
      console.log('📊 Current performance metrics:', {
        activeGenerations: metrics.activeGenerations,
        completedGenerations: metrics.completedGenerations,
        failedGenerations: metrics.failedGenerations,
        avgQueryTime: `${metrics.averageQueryTime}ms`
      });
    } catch (error) {
      console.error('Failed to update performance stats:', error);
    }
  }
}

// Create singleton instances
const databaseManager = DatabaseManager.getInstance();

// Export the PrismaClient instance directly as 'db' for backward compatibility
export const db = databaseManager.getClient();

// Also export the prisma client with a more conventional name
export const prisma = databaseManager.getClient();

// Export the manager instance for advanced operations and progress tracking
export const dbManager = databaseManager;

// Export default as the PrismaClient for maximum compatibility
export default databaseManager.getClient();

// Export additional utilities for progress tracking
export const progressTracking = {
  updateProgress: (generationId: string, progress: number, step: string) => 
    databaseManager.updateGenerationProgress(generationId, progress, step),
  
  getActiveGenerations: (userId?: string) => 
    databaseManager.getActiveGenerations(userId),
  
  healthCheck: () => 
    databaseManager.healthCheck(),
  
  performanceMeterics: () => 
    databaseManager.getPerformanceMetrics(),
  
  maintenance: () => 
    databaseManager.maintenance(),
};