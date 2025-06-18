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
   */
  async startGeneration(options: GenerationOptions): Promise<GenerationResult> {
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

      // Start processing asynchronously
      setImmediate(() => {
        this.processGeneration(generation.id, project, {
          hugoTheme: hugoTheme || 'ananke',
          customizations,
          contentOptions,
        }).catch((error) => {
          console.error(`Generation ${generation.id} failed:`, error);
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

      return {
        id: generation.id,
        status: generation.status,
      };
    } catch (error) {
      if (error instanceof AppError || error instanceof GenerationValidationError) {
        throw error;
      }
      throw new AppError('Failed to start generation', 500, 'GENERATION_START_ERROR');
    }
  }

  /**
   * Process generation (internal method)
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
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.PROCESSING);

      // Step 1: Auto-detect theme if needed
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.PROCESSING);

      // Step 2: Generate AI content
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.PROCESSING);
      const generatedContent = await this.generateAIContent(project, options);

      // Step 3: Create site structure
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.PROCESSING);
      const siteData = await this.createSiteStructure(generationId, project);

      // Step 4: Create file structure
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.PROCESSING);
      await this.createFileStructure(siteData, project);

      // Step 5: Build Hugo site
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.PROCESSING);
      const buildResult = await this.buildHugoSite(siteData);

      // Step 6: Package site
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.PROCESSING);
      const packageResult = await this.packageSite(generationId, buildResult);

      const generationTime = Date.now() - startTime;

      // Step 7: Complete generation
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

    } catch (error) {
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
      throw error;
    }
  }

  /**
   * Generate AI content for the website
   */
  private async generateAIContent(
    project: Project & { wizardSteps: any[] },
    options: GenerationOptions & { hugoTheme: string }
  ): Promise<any> {
    // This would integrate with the AI service
    // For now, return mock content based on wizard data
    const wizardData = project.wizardData as any;

    return {
      pages: [
        {
          name: 'index',
          title: wizardData.businessInfo?.name || project.name,
          content: `# Welcome to ${wizardData.businessInfo?.name || project.name}\n\n${wizardData.businessInfo?.description || 'Professional business website'}`,
          sections: wizardData.websiteStructure?.selectedSections || ['hero', 'about', 'services', 'contact'],
        },
        {
          name: 'about',
          title: 'About Us',
          content: `# About ${wizardData.businessInfo?.name}\n\n${wizardData.businessInfo?.description || 'Learn more about our company'}`,
        },
        {
          name: 'contact',
          title: 'Contact Us',
          content: '# Contact Us\n\nGet in touch with us today.',
        },
      ],
      config: {
        title: wizardData.businessInfo?.name || project.name,
        description: wizardData.businessInfo?.description || project.description,
        theme: options.hugoTheme,
      },
    };
  }

  /**
   * Create site structure
   */
  private async createSiteStructure(generationId: string, project: Project): Promise<any> {
    const siteId = `site-${generationId}`;
    const siteDir = path.join(this.outputDir, siteId);

    // Create site directory
    await fs.ensureDir(siteDir);

    return {
      siteId,
      siteDir,
      project,
    };
  }

  /**
   * Generate navigation menu based on wizard data
   */
  private generateNavigation(wizardData: any): any[] {
    const sections = wizardData?.websiteStructure?.selectedSections || ['home', 'about', 'services', 'contact'];
    
    return sections.map((section: string, index: number) => ({
      name: this.capitalize(section),
      url: section === 'home' ? '/' : `/${section}/`,
      weight: index + 1
    }));
  }

  /**
   * Create file structure for Hugo site
   */
  private async createFileStructure(siteData: any, project: Project & { wizardSteps: any[] }): Promise<void> {
    const wizardData = project.wizardData as any;
    
    try {
      // Create content directories
      const contentDir = path.join(siteData.siteDir, 'content');
      await fs.ensureDir(contentDir);
      
      // Create static directories
      const staticDir = path.join(siteData.siteDir, 'static');
      const staticSubDirs = ['images', 'css', 'js'];
      
      for (const subDir of staticSubDirs) {
        await fs.ensureDir(path.join(staticDir, subDir));
      }
      
      // Create data directory
      const dataDir = path.join(siteData.siteDir, 'data');
      await fs.ensureDir(dataDir);
      
      // Create empty content files based on wizard structure
      const selectedSections = wizardData?.websiteStructure?.selectedSections || ['home', 'about', 'services', 'contact'];
      
      for (const section of selectedSections) {
        const fileName = section === 'home' ? '_index.md' : `${section}.md`;
        const filePath = path.join(contentDir, fileName);
        
        // Create empty file with basic front matter
        const frontMatter = `---
title: "${this.capitalize(section)}"
date: ${new Date().toISOString()}
draft: false
---

`;
        await fs.writeFile(filePath, frontMatter);
      }
      
    } catch (error) {
      throw new Error(`Failed to create file structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Build Hugo site using Hugo CLI
   */
  private async buildHugoSite(siteData: any): Promise<{ sitePath: string; fileCount: number }> {
    try {
      // Build the site using Hugo CLI
      await execAsync('hugo', { cwd: siteData.siteDir });
      
      // Public path is where Hugo builds the site
      const publicPath = path.join(siteData.siteDir, 'public');
      
      // Count files
      const fileCount = await this.countFiles(publicPath);
      
      return { sitePath: publicPath, fileCount };
    } catch (error) {
      // Cleanup on error
      await fs.remove(siteData.siteDir).catch(() => {});
      throw new Error(`Failed to build Hugo site: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Package site into downloadable archive
   */
  private async packageSite(generationId: string, siteData: { sitePath: string; fileCount: number }): Promise<{
    fileName: string;
    fileSize: number;
    fileCount: number;
  }> {
    const fileName = `site-${generationId}.zip`;
    const filePath = path.join(this.outputDir, fileName);

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(filePath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', async () => {
        const stats = await fs.stat(filePath);
        
        // Cleanup temp directory
        await fs.remove(path.dirname(siteData.sitePath)).catch(() => {});

        resolve({
          fileName,
          fileSize: stats.size,
          fileCount: siteData.fileCount,
        });
      });

      archive.on('error', (err) => {
        reject(err);
      });

      archive.pipe(output);
      archive.directory(siteData.sitePath, false);
      archive.finalize();
    });
  }

  /**
   * Update generation status
   */
  private async updateGenerationStatus(
    generationId: string,
    status: SiteGenerationStatus,
    additionalData: Partial<SiteGeneration> = {}
  ): Promise<void> {
    await this.prisma.siteGeneration.update({
      where: { id: generationId },
      data: {
        status,
        ...additionalData,
      },
    });
  }

  /**
   * Count files in directory recursively
   * FIXED: Use fs-extra methods instead of Node.js fs
   */
  private async countFiles(dirPath: string): Promise<number> {
    let count = 0;
    
    try {
      // Check if directory exists
      if (!(await fs.pathExists(dirPath))) {
        return 0;
      }

      // Use fs-extra's readdir method
      const items = await fs.readdir(dirPath);
      
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = await fs.stat(itemPath);
        
        if (stats.isDirectory()) {
          count += await this.countFiles(itemPath);
        } else {
          count++;
        }
      }
      
      return count;
    } catch (error) {
      console.error(`Error counting files in ${dirPath}:`, error);
      return 0;
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
      // Don't throw error to avoid breaking the generation process
    }
  }

  /**
   * Cancel ongoing generation
   */
  async cancelGeneration(generationId: string, userId: string): Promise<boolean> {
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
        include: {
          project: true,
        },
      });

      if (!generation) {
        return false;
      }

      await this.updateGenerationStatus(generationId, SiteGenerationStatus.FAILED, {
        errorLog: 'Generation cancelled by user',
      });

      // Send cancellation webhook
      await this.sendWebhookNotification({
        event: 'failed',
        generationId,
        projectId: generation.projectId,
        userId,
        status: SiteGenerationStatus.FAILED,
        timestamp: new Date().toISOString(),
        data: {
          cancelled: true,
        },
      });

      return true;
    } catch (error) {
      throw new AppError('Failed to cancel generation', 500, 'GENERATION_CANCEL_ERROR');
    }
  }

  /**
   * Get generation status
   */
  async getGenerationStatus(generationId: string, userId: string): Promise<GenerationResult> {
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
        status: generation.status,
        siteUrl: generation.siteUrl || undefined,
        fileSize: generation.fileSize || undefined,
        fileCount: generation.fileCount || undefined,
        generationTime: generation.generationTime || undefined,
        errors: generation.errorLog ? [generation.errorLog] : undefined,
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
  ): Promise<{
    generations: any[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const offset = (page - 1) * pageSize;

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
          skip: offset,
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
        hugoTheme: gen.hugoTheme,
        startedAt: gen.startedAt,
        completedAt: gen.completedAt,
        generationTime: gen.generationTime,
        fileSize: gen.fileSize,
        fileCount: gen.fileCount,
        siteUrl: gen.siteUrl,
        expiresAt: gen.expiresAt,
        errors: gen.errorLog ? [gen.errorLog] : undefined,
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
   * Utility method to capitalize strings
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}

export const websiteGenerationService = new WebsiteGenerationService();