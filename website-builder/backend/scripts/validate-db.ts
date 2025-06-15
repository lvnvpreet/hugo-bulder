import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface HealthCheck {
  status: 'healthy' | 'unhealthy';
  message: string;
  timestamp: Date;
  details?: any;
}

export class DatabaseValidator {
  /**
   * Check database connection health
   */
  async checkConnection(): Promise<HealthCheck> {
    try {
      await prisma.$connect();
      await prisma.$queryRaw`SELECT 1`;
      
      return {
        status: 'healthy',
        message: 'Database connection is healthy',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Database connection failed',
        timestamp: new Date(),
        details: error
      };
    }
  }

  /**
   * Validate data integrity
   */
  async validateDataIntegrity(): Promise<HealthCheck> {
    try {
      const checks = await Promise.all([
        this.checkReferentialIntegrity(),
        this.checkRequiredData(),
        this.checkConstraints()
      ]);

      const failed = checks.filter(check => check.status === 'unhealthy');
      
      if (failed.length > 0) {
        return {
          status: 'unhealthy',
          message: `${failed.length} data integrity checks failed`,
          timestamp: new Date(),
          details: failed
        };
      }

      return {
        status: 'healthy',
        message: 'All data integrity checks passed',
        timestamp: new Date(),
        details: checks
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Data integrity validation failed',
        timestamp: new Date(),
        details: error
      };
    }
  }

  /**
   * Check referential integrity
   */
  private async checkReferentialIntegrity(): Promise<HealthCheck> {
    try {
      // Check for orphaned records
      const orphanedProjects = await prisma.project.count({
        where: {
          user: null
        }
      });

      const orphanedWizardSteps = await prisma.wizardStep.count({
        where: {
          project: null
        }
      });

      const orphanedServiceTemplates = await prisma.serviceTemplate.count({
        where: {
          businessCategory: null
        }
      });

      if (orphanedProjects > 0 || orphanedWizardSteps > 0 || orphanedServiceTemplates > 0) {
        return {
          status: 'unhealthy',
          message: 'Orphaned records found',
          timestamp: new Date(),
          details: {
            orphanedProjects,
            orphanedWizardSteps,
            orphanedServiceTemplates
          }
        };
      }

      return {
        status: 'healthy',
        message: 'Referential integrity is maintained',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Referential integrity check failed',
        timestamp: new Date(),
        details: error
      };
    }
  }

  /**
   * Check required reference data
   */
  private async checkRequiredData(): Promise<HealthCheck> {
    try {
      const counts = {
        businessCategories: await prisma.businessCategory.count(),
        serviceTemplates: await prisma.serviceTemplate.count(),
        websiteStructures: await prisma.websiteStructure.count(),
        hugoThemes: await prisma.hugoTheme.count()
      };

      const missing = Object.entries(counts)
        .filter(([key, count]) => count === 0)
        .map(([key]) => key);

      if (missing.length > 0) {
        return {
          status: 'unhealthy',
          message: `Missing required reference data: ${missing.join(', ')}`,
          timestamp: new Date(),
          details: counts
        };
      }

      return {
        status: 'healthy',
        message: 'All required reference data is present',
        timestamp: new Date(),
        details: counts
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Required data check failed',
        timestamp: new Date(),
        details: error
      };
    }
  }

  /**
   * Check database constraints
   */
  private async checkConstraints(): Promise<HealthCheck> {
    try {
      // Check for duplicate emails
      const duplicateEmails = await prisma.$queryRaw`
        SELECT email, COUNT(*) as count 
        FROM users 
        GROUP BY email 
        HAVING COUNT(*) > 1
      `;

      // Check for duplicate project slugs
      const duplicateSlugs = await prisma.$queryRaw`
        SELECT slug, COUNT(*) as count 
        FROM projects 
        GROUP BY slug 
        HAVING COUNT(*) > 1
      `;

      const issues = [];
      if (Array.isArray(duplicateEmails) && duplicateEmails.length > 0) {
        issues.push(`Duplicate emails found: ${duplicateEmails.length}`);
      }
      if (Array.isArray(duplicateSlugs) && duplicateSlugs.length > 0) {
        issues.push(`Duplicate project slugs found: ${duplicateSlugs.length}`);
      }

      if (issues.length > 0) {
        return {
          status: 'unhealthy',
          message: `Constraint violations: ${issues.join(', ')}`,
          timestamp: new Date(),
          details: { duplicateEmails, duplicateSlugs }
        };
      }

      return {
        status: 'healthy',
        message: 'All database constraints are satisfied',
        timestamp: new Date()
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Constraint check failed',
        timestamp: new Date(),
        details: error
      };
    }
  }

  /**
   * Get performance metrics
   */
  async getPerformanceMetrics(): Promise<any> {
    try {
      const metrics = await Promise.all([
        this.getTableSizes(),
        this.getIndexUsage(),
        this.getQueryPerformance()
      ]);

      return {
        status: 'healthy',
        message: 'Performance metrics collected',
        timestamp: new Date(),
        details: {
          tableSizes: metrics[0],
          indexUsage: metrics[1],
          queryPerformance: metrics[2]
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Failed to collect performance metrics',
        timestamp: new Date(),
        details: error
      };
    }
  }

  private async getTableSizes(): Promise<any> {
    return prisma.$queryRaw`
      SELECT 
        schemaname,
        tablename,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size,
        pg_total_relation_size(schemaname||'.'||tablename) as size_bytes
      FROM pg_tables 
      WHERE schemaname = 'public'
      ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
    `;
  }

  private async getIndexUsage(): Promise<any> {
    return prisma.$queryRaw`
      SELECT 
        indexrelname as index_name,
        relname as table_name,
        idx_scan as times_used,
        idx_tup_read as tuples_read,
        idx_tup_fetch as tuples_fetched
      FROM pg_stat_user_indexes 
      ORDER BY idx_scan DESC
    `;
  }

  private async getQueryPerformance(): Promise<any> {
    return prisma.$queryRaw`
      SELECT 
        query,
        calls,
        total_time,
        mean_time,
        stddev_time,
        max_time
      FROM pg_stat_statements 
      WHERE query NOT LIKE '%pg_stat_statements%'
      ORDER BY total_time DESC 
      LIMIT 10
    `;
  }

  /**
   * Run complete health check
   */
  async runHealthCheck(): Promise<{
    overall: 'healthy' | 'unhealthy';
    checks: HealthCheck[];
    timestamp: Date;
  }> {
    const checks = await Promise.all([
      this.checkConnection(),
      this.validateDataIntegrity()
    ]);

    const unhealthyChecks = checks.filter(check => check.status === 'unhealthy');
    
    return {
      overall: unhealthyChecks.length === 0 ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date()
    };
  }
}

// CLI usage
if (require.main === module) {
  const validator = new DatabaseValidator();
  
  (async () => {
    console.log('🔍 Running database health check...');
    const result = await validator.runHealthCheck();
    
    console.log(`\n📊 Overall Status: ${result.overall.toUpperCase()}`);
    console.log(`⏰ Timestamp: ${result.timestamp.toISOString()}`);
    
    result.checks.forEach((check, index) => {
      console.log(`\n${index + 1}. ${check.message}`);
      console.log(`   Status: ${check.status}`);
      if (check.details) {
        console.log(`   Details:`, JSON.stringify(check.details, null, 2));
      }
    });

    if (result.overall === 'unhealthy') {
      process.exit(1);
    }
  })()
    .catch(error => {
      console.error('❌ Health check failed:', error);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}

export default DatabaseValidator;
