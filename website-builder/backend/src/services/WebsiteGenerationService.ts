import { PrismaClient, SiteGenerationStatus, Project, SiteGeneration } from '@prisma/client';
import { db } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { webhookService } from './WebhookService';
import { ThemeDetectionService } from './ThemeDetectionService';
import { 
  GenerationStep, 
  GENERATION_STEPS, 
  createGenerationSteps, 
  calculateGenerationProgress,
  validateGenerationOptions,
  GenerationValidationError
} from '../types/generation';
import * as fs from 'fs-extra';
import * as path from 'path';
import archiver from 'archiver';
import { v4 as uuidv4 } from 'uuid';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as yaml from 'js-yaml';

const execAsync = promisify(exec);

interface WebhookPayload {
  event: 'started' | 'progress' | 'completed' | 'failed';
  generationId: string;
  projectId: string;
  userId: string;
  status: SiteGenerationStatus;
  progress?: number;
  currentStep?: string;
  timestamp: string;
  data?: any;
}

interface GenerationOptions {
  projectId: string;
  userId: string;
  hugoTheme?: string;
  customizations?: {
    colors?: Record<string, string>;
    fonts?: Record<string, string>;
    layout?: Record<string, any>;
  };
  contentOptions?: {
    aiModel?: string;
    tone?: string;
    length?: 'short' | 'medium' | 'long';
    includeSEO?: boolean;
  };
  autoDetectTheme?: boolean;
}

interface GenerationProgress {
  step: string;
  progress: number;
  message: string;
  details?: any;
}

interface GenerationResult {
  id: string;
  status: SiteGenerationStatus;
  siteUrl?: string;
  fileSize?: number;
  fileCount?: number;
  generationTime?: number;
  errors?: string[];
}

export class WebsiteGenerationService {
  private prisma: PrismaClient;
  private outputDir: string;
  private themeDetection: ThemeDetectionService;

  constructor() {
    // Fix: Ensure prisma is properly initialized
    this.prisma = db;
    
    // Add safety check to ensure db is available
    if (!this.prisma) {
      throw new Error('Database connection not available. Make sure database is properly configured.');
    }

    this.outputDir = path.join(process.cwd(), 'generated-sites');
    this.themeDetection = new ThemeDetectionService();
    
    // Ensure output directory exists
    fs.ensureDirSync(this.outputDir);
  }

  /**
   * Start website generation process
   */
  async startGeneration(options: GenerationOptions): Promise<string> {
    const { projectId, userId, hugoTheme, customizations, contentOptions } = options;
    
    try {
      console.log('🎨 Starting theme detection with wizard data');
      console.log('📋 Website type:', options);
      
      // Validate generation options
      const validationResult = validateGenerationOptions(options);
      if (!validationResult.isValid) {
        throw new GenerationValidationError(
          'Invalid generation options',
          validationResult.errors
        );
      }

      // Add null check for prisma
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      // Check if project exists and belongs to user
      console.log(`🔍 Checking project ${projectId} for user ${userId}`);
      
      const project = await this.prisma.project.findFirst({
        where: {
          id: projectId,
          userId: userId,
        },
        include: {
          wizardSteps: true,
        },
      });

      if (!project) {
        throw new AppError('Project not found or access denied', 404, 'PROJECT_NOT_FOUND');
      }

      // Check if project is completed (has all required wizard data)
      if (!project.isCompleted) {
        throw new AppError('Project must be completed before generation', 400, 'PROJECT_NOT_COMPLETED');
      }

      // Check for any active generation for this project
      const activeGeneration = await this.prisma.siteGeneration.findFirst({
        where: {
          projectId: projectId,
          status: {
            in: [
              SiteGenerationStatus.PENDING,
              SiteGenerationStatus.INITIALIZING,
              SiteGenerationStatus.BUILDING_STRUCTURE,
              SiteGenerationStatus.APPLYING_THEME,
              SiteGenerationStatus.GENERATING_CONTENT,
              SiteGenerationStatus.BUILDING_SITE,
              SiteGenerationStatus.PACKAGING,
            ],
          },
        },
      });

      if (activeGeneration) {
        throw new AppError('Generation already in progress for this project', 409, 'GENERATION_IN_PROGRESS');
      }

      // Determine Hugo theme
      let finalTheme = hugoTheme || 'ananke'; // Default fallback theme
      
      if (options.autoDetectTheme || !hugoTheme) {
        try {
          console.log('🎯 Auto-detecting theme based on project data...');
          const detectedTheme = await this.themeDetection.detectTheme(project.wizardData);
          if (detectedTheme) {
            finalTheme = detectedTheme;
            console.log(`✅ Theme auto-detected: ${finalTheme}`);
          }
        } catch (themeError) {
          console.warn('⚠️ Theme detection failed, using fallback:', themeError);
          // Continue with default theme
        }
      }

      // Create generation record with all new fields
      const generationId = uuidv4();
      const generation = await this.prisma.siteGeneration.create({
        data: {
          id: generationId,
          projectId: projectId,
          status: SiteGenerationStatus.PENDING,
          hugoTheme: finalTheme,
          customizations: customizations || {},
          contentOptions: contentOptions || {},
          progress: 0,
          currentStep: 'Initializing...',
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        },
      });

      console.log(`✅ Generation record created: ${generationId}`);

      // Send webhook notification for generation started
      await this.sendWebhookNotification({
        event: 'started',
        generationId: generation.id,
        projectId: projectId,
        userId: userId,
        status: SiteGenerationStatus.PENDING,
        timestamp: new Date().toISOString(),
        data: {
          theme: finalTheme,
          customizations,
          contentOptions,
        },
      });

      // Start the actual generation process asynchronously
      setImmediate(() => {
        this.processGeneration(generationId, project, {
          hugoTheme: finalTheme,
          customizations,
          contentOptions,
        }).catch((error) => {
          console.error(`❌ Generation ${generationId} failed:`, error);
        });
      });

      console.log(`✅ Generation queued successfully: ${generationId}`);
      
      return generationId;

    } catch (error) {
      console.error('❌ Failed to start generation:', error);
      
      if (error instanceof AppError) {
        throw error;
      }
      
      if (error instanceof GenerationValidationError) {
        throw new AppError(error.message, 400, 'VALIDATION_ERROR');
      }

      throw new AppError('Failed to start generation', 500, 'GENERATION_START_ERROR');
    }
  }

  /**
   * Process generation asynchronously
   */
  private async processGeneration(
    generationId: string,
    project: Project & { wizardSteps: any[] },
    options: {
      hugoTheme: string;
      customizations?: any;
      contentOptions?: any;
    }
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Step 1: Initialize
      await this.updateGenerationProgress(generationId, {
        step: 'Initializing generation environment...',
        progress: 5,
        message: 'Setting up generation workspace',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.INITIALIZING);

      // Step 2: Analyze project data
      await this.updateGenerationProgress(generationId, {
        step: 'Analyzing project data...',
        progress: 15,
        message: 'Processing wizard configuration',
      });

      // Step 3: Generate content
      await this.updateGenerationProgress(generationId, {
        step: 'Generating website content...',
        progress: 35,
        message: 'Creating pages and content',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.GENERATING_CONTENT);

      // Simulate content generation
      await this.sleep(2000);

      // Step 4: Apply theme
      await this.updateGenerationProgress(generationId, {
        step: 'Applying theme and customizations...',
        progress: 55,
        message: 'Configuring design and layout',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.APPLYING_THEME);

      // Step 5: Build site
      await this.updateGenerationProgress(generationId, {
        step: 'Building Hugo site...',
        progress: 75,
        message: 'Compiling static website',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.BUILDING_SITE);

      // Simulate Hugo build
      await this.sleep(2000);

      // Step 6: Package
      await this.updateGenerationProgress(generationId, {
        step: 'Packaging website...',
        progress: 90,
        message: 'Creating downloadable archive',
      });
      await this.updateStatus(generationId, SiteGenerationStatus.PACKAGING);

      // Create mock download file
      const fileName = `${project.slug}-website-${Date.now()}.zip`;
      const filePath = path.join(this.outputDir, fileName);
      
      // Create a simple mock zip file
      await fs.writeFile(filePath, 'Mock website content');
      const stats = await fs.stat(filePath);

      // Step 7: Complete
      const generationTime = Date.now() - startTime;
      
      await this.completeGeneration(generationId, {
        siteUrl: fileName,
        fileSize: stats.size,
        fileCount: 25, // Mock file count
        generationTime,
      });

      await this.updateGenerationProgress(generationId, {
        step: 'Generation completed successfully!',
        progress: 100,
        message: 'Website is ready for download',
      });

      console.log(`🎉 Generation ${generationId} completed in ${generationTime}ms`);

    } catch (error) {
      console.error(`❌ Generation ${generationId} failed:`, error);
      await this.failGeneration(generationId, error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Update generation progress
   */
  async updateGenerationProgress(
    generationId: string,
    progress: GenerationProgress
  ): Promise<void> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          progress: progress.progress,
          currentStep: progress.step,
        },
      });

      // Send webhook notification for progress update
      const generation = await this.prisma.siteGeneration.findUnique({
        where: { id: generationId },
        include: { project: true },
      });

      if (generation) {
        await this.sendWebhookNotification({
          event: 'progress',
          generationId,
          projectId: generation.projectId,
          userId: generation.project.userId,
          status: generation.status,
          progress: progress.progress,
          currentStep: progress.step,
          timestamp: new Date().toISOString(),
          data: progress.details,
        });
      }
    } catch (error) {
      console.error('Failed to update generation progress:', error);
      // Don't throw - progress updates shouldn't stop generation
    }
  }

  /**
   * Update generation status
   */
  private async updateStatus(generationId: string, status: SiteGenerationStatus): Promise<void> {
    try {
      await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: { status },
      });
    } catch (error) {
      console.error('Failed to update generation status:', error);
    }
  }

  /**
   * Complete generation
   */
  async completeGeneration(
    generationId: string,
    result: Partial<GenerationResult>
  ): Promise<void> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const generation = await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          status: SiteGenerationStatus.COMPLETED,
          progress: 100,
          currentStep: 'Completed',
          completedAt: new Date(),
          siteUrl: result.siteUrl,
          fileSize: result.fileSize,
          fileCount: result.fileCount,
          generationTime: result.generationTime,
        },
        include: {
          project: true,
        },
      });

      // Send webhook notification for completion
      await this.sendWebhookNotification({
        event: 'completed',
        generationId,
        projectId: generation.projectId,
        userId: generation.project.userId,
        status: SiteGenerationStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        data: {
          siteUrl: result.siteUrl,
          fileSize: result.fileSize,
          fileCount: result.fileCount,
          generationTime: result.generationTime,
        },
      });
    } catch (error) {
      console.error('Failed to complete generation:', error);
      throw new AppError('Failed to complete generation', 500, 'COMPLETION_ERROR');
    }
  }

  /**
   * Fail generation
   */
  async failGeneration(generationId: string, error: string): Promise<void> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const generation = await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          status: SiteGenerationStatus.FAILED,
          progress: 0,
          currentStep: 'Generation failed',
          completedAt: new Date(),
          errorLog: error,
        },
        include: {
          project: true,
        },
      });

      // Send webhook notification for failure
      await this.sendWebhookNotification({
        event: 'failed',
        generationId,
        projectId: generation.projectId,
        userId: generation.project.userId,
        status: SiteGenerationStatus.FAILED,
        timestamp: new Date().toISOString(),
        data: {
          error,
        },
      });
    } catch (dbError) {
      console.error('Failed to mark generation as failed:', dbError);
      throw new AppError('Failed to update generation status', 500, 'FAILURE_UPDATE_ERROR');
    }
  }

  /**
   * Get generation status
   */
  async getGenerationStatus(generationId: string, userId: string): Promise<any> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const generation = await this.prisma.siteGeneration.findFirst({
        where: {
          id: generationId,
          project: {
            userId: userId,
          },
        },
        include: {
          project: true,
        },
      });

      if (!generation) {
        throw new AppError('Generation not found', 404, 'GENERATION_NOT_FOUND');
      }

      return {
        id: generation.id,
        projectId: generation.projectId,
        status: generation.status,
        progress: generation.progress || 0,
        currentStep: generation.currentStep || 'Processing...',
        startedAt: generation.startedAt,
        completedAt: generation.completedAt,
        siteUrl: generation.siteUrl,
        fileSize: generation.fileSize,
        fileCount: generation.fileCount,
        generationTime: generation.generationTime,
        expiresAt: generation.expiresAt,
        errorLog: generation.errorLog,
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get generation status', 500, 'GENERATION_STATUS_ERROR');
    }
  }

  /**
   * Get generation history for user
   */
  async getGenerationHistory(
    userId: string,
    page: number = 1,
    pageSize: number = 10
  ): Promise<any> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const skip = (page - 1) * pageSize;

      const [generations, total] = await Promise.all([
        this.prisma.siteGeneration.findMany({
          where: {
            project: {
              userId: userId,
            },
          },
          include: {
            project: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
          orderBy: {
            startedAt: 'desc',
          },
          skip,
          take: pageSize,
        }),
        this.prisma.siteGeneration.count({
          where: {
            project: {
              userId: userId,
            },
          },
        }),
      ]);

      const results = generations.map((gen) => ({
        id: gen.id,
        projectId: gen.projectId,
        projectName: gen.project.name,
        projectSlug: gen.project.slug,
        status: gen.status,
        progress: gen.progress || 0,
        currentStep: gen.currentStep || 'Processing...',
        startedAt: gen.startedAt,
        completedAt: gen.completedAt,
        generationTime: gen.generationTime,
        fileSize: gen.fileSize,
        fileCount: gen.fileCount,
        siteUrl: gen.siteUrl,
        expiresAt: gen.expiresAt,
        errorLog: gen.errorLog,
      }));

      return {
        generations: results,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      throw new AppError('Failed to get generation history', 500, 'GENERATION_HISTORY_ERROR');
    }
  }

  /**
   * Download generated website
   */
  async downloadGeneration(generationId: string, userId: string): Promise<{
    filePath: string;
    fileName: string;
    mimeType: string;
  }> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const generation = await this.prisma.siteGeneration.findFirst({
        where: {
          id: generationId,
          project: {
            userId: userId,
          },
          status: SiteGenerationStatus.COMPLETED,
        },
        include: {
          project: true,
        },
      });

      if (!generation) {
        throw new AppError('Generation not found or not completed', 404, 'GENERATION_NOT_AVAILABLE');
      }

      if (generation.expiresAt && generation.expiresAt < new Date()) {
        throw new AppError('Download link has expired', 410, 'DOWNLOAD_EXPIRED');
      }

      if (!generation.siteUrl) {
        throw new AppError('Generated site file not found', 404, 'SITE_FILE_NOT_FOUND');
      }

      const filePath = path.join(this.outputDir, generation.siteUrl);
      
      if (!(await fs.pathExists(filePath))) {
        throw new AppError('Generated site file not found on disk', 404, 'SITE_FILE_MISSING');
      }

      return {
        filePath,
        fileName: `${generation.project.slug}-website.zip`,
        mimeType: 'application/zip',
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to download generation', 500, 'GENERATION_DOWNLOAD_ERROR');
    }
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(generationId: string, userId: string): Promise<void> {
    try {
      if (!this.prisma) {
        throw new AppError('Database connection not available', 500, 'DATABASE_NOT_AVAILABLE');
      }

      const generation = await this.prisma.siteGeneration.findFirst({
        where: {
          id: generationId,
          project: {
            userId: userId,
          },
          status: {
            in: [
              SiteGenerationStatus.PENDING,
              SiteGenerationStatus.INITIALIZING,
              SiteGenerationStatus.BUILDING_STRUCTURE,
              SiteGenerationStatus.APPLYING_THEME,
              SiteGenerationStatus.GENERATING_CONTENT,
              SiteGenerationStatus.BUILDING_SITE,
              SiteGenerationStatus.PACKAGING,
            ],
          },
        },
      });

      if (!generation) {
        throw new AppError('Generation not found or cannot be cancelled', 404, 'GENERATION_NOT_CANCELLABLE');
      }

      await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          status: SiteGenerationStatus.FAILED,
          progress: 0,
          currentStep: 'Cancelled by user',
          errorLog: 'Generation cancelled by user',
          completedAt: new Date(),
        },
      });

      // Send webhook notification
      await this.sendWebhookNotification({
        event: 'failed',
        generationId,
        projectId: generation.projectId,
        userId,
        status: SiteGenerationStatus.FAILED,
        timestamp: new Date().toISOString(),
        data: {
          reason: 'cancelled_by_user',
        },
      });
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to cancel generation', 500, 'GENERATION_CANCEL_ERROR');
    }
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(payload: WebhookPayload): Promise<void> {
    try {
      await webhookService.sendWebhook(payload);
    } catch (error) {
      console.error('Failed to send webhook notification:', error);
      // Don't throw - webhook failures shouldn't stop generation
    }
  }

  /**
   * Utility method to sleep
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Utility method to capitalize strings
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const websiteGenerationService = new WebsiteGenerationService();