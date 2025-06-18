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
    this.prisma = db;
    this.outputDir = path.join(process.cwd(), 'generated-sites');
    this.themeDetection = new ThemeDetectionService();
    
    // Ensure output directory exists
    fs.ensureDirSync(this.outputDir);
  }

  /**
   * Start website generation process
   * This method should ONLY create the generation record and return immediately
   */
  async startGeneration(options: GenerationOptions): Promise<string> {
    const { projectId, userId, hugoTheme, customizations, contentOptions } = options;
    
    try {
      // Validate generation options
      const validationResult = validateGenerationOptions(options);
      if (!validationResult.isValid) {
        throw new GenerationValidationError(
          'Invalid generation options',
          validationResult.errors
        );
      }

      // Check if project exists and belongs to user
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
        throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
      }

      if (!project.isCompleted) {
        throw new AppError('Project is not completed', 400, 'PROJECT_NOT_COMPLETED');
      }

      // Check for existing active generation
      const existingGeneration = await this.prisma.siteGeneration.findFirst({
        where: {
          projectId,
          status: {
            in: [SiteGenerationStatus.PENDING, SiteGenerationStatus.PROCESSING],
          },
        },
      });

      if (existingGeneration) {
        throw new AppError(
          'Generation already in progress for this project',
          409,
          'GENERATION_IN_PROGRESS'
        );
      }

      // Create generation record with expiration (7 days from now)
      const generation = await this.prisma.siteGeneration.create({
        data: {
          projectId,
          hugoTheme: hugoTheme || 'ananke',
          status: SiteGenerationStatus.PENDING,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      console.log(`✅ Generation record created: ${generation.id}`);

      // Start processing asynchronously
      setImmediate(() => {
        this.processGeneration(generation.id, project, {
          hugoTheme: hugoTheme || 'ananke',
          customizations,
          contentOptions,
        }).catch((error) => {
          console.error(`❌ Generation ${generation.id} failed:`, error);
        });
      });

      // Send webhook notification for generation start
      await this.sendWebhookNotification({
        event: 'started',
        generationId: generation.id,
        projectId,
        userId,
        status: SiteGenerationStatus.PENDING,
        timestamp: new Date().toISOString(),
      });

      // Return only the generation ID
      return generation.id;
      
    } catch (error) {
      if (error instanceof AppError || error instanceof GenerationValidationError) {
        throw error;
      }
      console.error('❌ Failed to start generation:', error);
      throw new AppError('Failed to start generation', 500, 'GENERATION_START_ERROR');
    }
  }

  /**
   * Process generation (internal method) - runs asynchronously
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
      console.log(`🚀 Starting generation process for: ${generationId}`);
      
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.PROCESSING);

      // Step 1: Auto-detect theme if needed (10%)
      console.log(`📋 Step 1: Theme detection for generation ${generationId}`);
      await this.updateGenerationProgress(generationId, 10, 'Analyzing theme requirements...');

      // Step 2: Generate AI content (40%)
      console.log(`🤖 Step 2: Generating AI content for generation ${generationId}`);
      await this.updateGenerationProgress(generationId, 40, 'Generating website content...');
      const generatedContent = await this.generateAIContent(project, options);

      // Step 3: Create site structure (60%)
      console.log(`🏗️ Step 3: Creating site structure for generation ${generationId}`);
      await this.updateGenerationProgress(generationId, 60, 'Creating site structure...');
      const siteData = await this.createSiteStructure(generationId, project);

      // Step 4: Create file structure (80%)
      console.log(`📁 Step 4: Creating file structure for generation ${generationId}`);
      await this.updateGenerationProgress(generationId, 80, 'Building file structure...');
      await this.createFileStructure(siteData, project);

      // Step 5: Build Hugo site (90%)
      console.log(`⚡ Step 5: Building Hugo site for generation ${generationId}`);
      await this.updateGenerationProgress(generationId, 90, 'Building static site...');
      const buildResult = await this.buildHugoSite(siteData);

      // Step 6: Package site (95%)
      console.log(`📦 Step 6: Packaging site for generation ${generationId}`);
      await this.updateGenerationProgress(generationId, 95, 'Packaging website...');
      const packageResult = await this.packageSite(generationId, buildResult);

      const generationTime = Date.now() - startTime;

      // Step 7: Complete generation (100%)
      console.log(`✅ Step 7: Completing generation ${generationId}`);
      await this.updateGenerationStatus(
        generationId,
        SiteGenerationStatus.COMPLETED,
        {
          siteUrl: packageResult.fileName,
          fileSize: packageResult.fileSize,
          fileCount: packageResult.fileCount,
          generationTime,
          completedAt: new Date(),
        }
      );

      // Send completion webhook
      await this.sendWebhookNotification({
        event: 'completed',
        generationId,
        projectId: project.id,
        userId: project.userId,
        status: SiteGenerationStatus.COMPLETED,
        timestamp: new Date().toISOString(),
        data: {
          generationTime,
          fileSize: packageResult.fileSize,
          fileCount: packageResult.fileCount,
        },
      });

      console.log(`🎉 Generation ${generationId} completed successfully in ${generationTime}ms`);

    } catch (error) {
      console.error(`❌ Generation ${generationId} failed:`, error);
      
      await this.updateGenerationStatus(
        generationId,
        SiteGenerationStatus.FAILED,
        {
          errorLog: error instanceof Error ? error.message : String(error),
        }
      );

      // Send failure webhook
      await this.sendWebhookNotification({
        event: 'failed',
        generationId,
        projectId: project.id,
        userId: project.userId,
        status: SiteGenerationStatus.FAILED,
        timestamp: new Date().toISOString(),
        data: {
          error: error instanceof Error ? error.message : String(error),
        },
      });
    }
  }

  /**
   * Update generation status in database
   */
  private async updateGenerationStatus(
    generationId: string,
    status: SiteGenerationStatus,
    additionalData?: any
  ): Promise<void> {
    try {
      await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          status,
          ...additionalData,
        },
      });
    } catch (error) {
      console.error(`Failed to update generation status for ${generationId}:`, error);
    }
  }

  /**
   * Update generation progress
   */
  private async updateGenerationProgress(
    generationId: string,
    progress: number,
    currentStep: string
  ): Promise<void> {
    try {
      await this.prisma.siteGeneration.update({
        where: { id: generationId },
        data: {
          progress,
          currentStep,
        },
      });

      // Send progress webhook
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
          progress,
          currentStep,
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error(`Failed to update generation progress for ${generationId}:`, error);
    }
  }

  /**
   * Mock AI content generation (replace with actual AI service)
   */
  private async generateAIContent(
    project: Project & { wizardSteps: any[] },
    options: any
  ): Promise<any> {
    // Simulate AI processing time
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return {
      pages: {
        home: 'Generated home content',
        about: 'Generated about content',
        services: 'Generated services content',
        contact: 'Generated contact content',
      },
      seo: {
        title: `${project.name} - Professional Website`,
        description: `Discover ${project.name} - your trusted partner for professional services.`,
        keywords: 'professional, services, business',
      },
    };
  }

  /**
   * Create site structure
   */
  private async createSiteStructure(
    generationId: string,
    project: Project
  ): Promise<any> {
    const sitePath = path.join(this.outputDir, generationId);
    await fs.ensureDir(sitePath);
    
    return {
      path: sitePath,
      contentPath: path.join(sitePath, 'content'),
      staticPath: path.join(sitePath, 'static'),
      configPath: path.join(sitePath, 'config.yaml'),
    };
  }

  /**
   * Create file structure
   */
  private async createFileStructure(
    siteData: any,
    project: Project
  ): Promise<void> {
    // Create directories
    await fs.ensureDir(siteData.contentPath);
    await fs.ensureDir(siteData.staticPath);
    
    // Create basic config
    const config = {
      baseURL: 'https://example.com',
      languageCode: 'en-us',
      title: project.name,
      theme: 'ananke',
    };
    
    await fs.writeFile(siteData.configPath, yaml.dump(config));
    
    // Create index page
    const indexContent = `---
title: "${project.name}"
date: ${new Date().toISOString()}
draft: false
---

Welcome to ${project.name}!
`;
    
    await fs.writeFile(
      path.join(siteData.contentPath, '_index.md'),
      indexContent
    );
  }

  /**
   * Build Hugo site (mock implementation)
   */
  private async buildHugoSite(siteData: any): Promise<any> {
    // Simulate Hugo build time
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const publicPath = path.join(siteData.path, 'public');
    await fs.ensureDir(publicPath);
    
    // Create mock HTML file
    const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>Generated Website</title>
</head>
<body>
    <h1>Your website has been generated!</h1>
    <p>This is a mock generated website.</p>
</body>
</html>`;
    
    await fs.writeFile(path.join(publicPath, 'index.html'), htmlContent);
    
    return {
      publicPath,
      files: ['index.html'],
    };
  }

  /**
   * Package site into ZIP
   */
  private async packageSite(
    generationId: string,
    buildResult: any
  ): Promise<any> {
    const outputPath = path.join(this.outputDir, `${generationId}.zip`);
    
    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(outputPath);
      const archive = archiver('zip', { zlib: { level: 9 } });
      
      output.on('close', () => {
        const stats = fs.statSync(outputPath);
        resolve({
          fileName: `${generationId}.zip`,
          filePath: outputPath,
          fileSize: stats.size,
          fileCount: archive.pointer(),
        });
      });
      
      archive.on('error', reject);
      archive.pipe(output);
      archive.directory(buildResult.publicPath, false);
      archive.finalize();
    });
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
   * Get generation status
   */
  async getGenerationStatus(generationId: string, userId: string): Promise<any> {
    try {
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
        currentStep: generation.currentStep,
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
        currentStep: gen.currentStep,
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
      const generation = await this.prisma.siteGeneration.findFirst({
        where: {
          id: generationId,
          project: {
            userId: userId,
          },
          status: {
            in: [SiteGenerationStatus.PENDING, SiteGenerationStatus.PROCESSING],
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
   * Utility method to capitalize strings
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const websiteGenerationService = new WebsiteGenerationService();