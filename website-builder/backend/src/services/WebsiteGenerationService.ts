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
  hugoTheme?: string; // Made optional for auto-detection
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
  autoDetectTheme?: boolean; // NEW: Flag to enable auto-detection
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
  private tempDir: string;
  private themeDetector: ThemeDetectionService;

  constructor() {
    this.prisma = db.getClient();
    this.outputDir = path.join(process.cwd(), 'generated-sites');
    this.tempDir = path.join(process.cwd(), 'temp-generation');
    this.themeDetector = new ThemeDetectionService();
    this.ensureDirectories();
  }

  private async ensureDirectories(): Promise<void> {
    await fs.ensureDir(this.outputDir);
    await fs.ensureDir(this.tempDir);
  }  /**
   * UPDATED: Auto-detect theme if not provided
   */
  async startGeneration(options: GenerationOptions): Promise<string> {
    try {
      // Validate options
      validateGenerationOptions(options);

      // Get project with wizard data
      const project = await this.getProjectWithWizardData(options.projectId, options.userId);

      // AUTO-DETECT THEME (since frontend no longer sends hugoTheme)
      let selectedTheme = options.hugoTheme;
      let themeExplanation = '';
      
      if (!selectedTheme && project.wizardData) {
        console.log('🤖 Auto-detecting theme based on project data...');
        const recommendation = this.themeDetector.detectTheme(project.wizardData);
        selectedTheme = recommendation.themeId;
        themeExplanation = this.themeDetector.getThemeExplanation(recommendation);
        
        console.log(`✅ Auto-selected theme: ${selectedTheme} (${recommendation.confidence}% confidence)`);
      }

      // Fallback to default theme if still no theme
      if (!selectedTheme) {
        selectedTheme = 'ananke';
        console.log('⚠️ No theme detected, using default: ananke');
      }      // AUTO-DETECT COLOR SCHEME if not provided
      let colorScheme = options.customizations?.colors;
      if (!colorScheme && project.wizardData) {
        const detectedColors = this.themeDetector.detectColorScheme(project.wizardData, selectedTheme);
        colorScheme = {
          primary: detectedColors.primary,
          secondary: detectedColors.secondary,
          accent: detectedColors.accent,
          background: detectedColors.background,
          text: detectedColors.text
        };
        console.log('🎨 Auto-detected color scheme:', colorScheme);
      }

      // Create generation record with detected theme
      const generation = await this.prisma.siteGeneration.create({
        data: {
          projectId: options.projectId,
          status: SiteGenerationStatus.PENDING,
          hugoTheme: selectedTheme,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
        },
      });

      // Send webhook notification
      await this.sendWebhookNotification({
        event: 'started',
        generationId: generation.id,
        projectId: options.projectId,
        userId: options.userId,
        status: SiteGenerationStatus.PENDING,
        timestamp: new Date().toISOString(),
      });      // Start async generation process with auto-detected theme
      const updatedOptions: GenerationOptions & { hugoTheme: string } = {
        ...options,
        hugoTheme: selectedTheme,
        customizations: {
          ...options.customizations,
          colors: colorScheme || options.customizations?.colors
        }
      };

      this.processGeneration(generation.id, project, updatedOptions).catch((error) => {
        console.error(`Generation ${generation.id} failed:`, error);
        this.updateGenerationStatus(generation.id, SiteGenerationStatus.FAILED, {
          errorLog: error instanceof Error ? error.message : String(error),
        });
      });

      return generation.id;
    } catch (error) {
      if (error instanceof AppError || error instanceof GenerationValidationError) throw error;
      throw new AppError('Failed to start generation', 500, 'GENERATION_START_ERROR');
    }
  }
  /**
   * Get project with wizard data - helper method
   */
  private async getProjectWithWizardData(projectId: string, userId: string): Promise<Project & { wizardData: any; wizardSteps: any[] }> {
    const project = await this.prisma.project.findFirst({
      where: {
        id: projectId,
        userId: userId,
      },
      include: {
        wizardSteps: true,
      },
    });

    console.log('🔍 Generation service - Project lookup:', {
      projectId: projectId,
      userId: userId,
      found: !!project,
      isCompleted: project?.isCompleted,
      hasWizardData: !!project?.wizardData
    });

    if (!project) {
      throw new AppError('Project not found', 404, 'PROJECT_NOT_FOUND');
    }

    if (!project.isCompleted) {
      console.log('❌ Project not completed:', {
        projectId: project.id,
        isCompleted: project.isCompleted,
        currentStep: project.currentStep,
        wizardStepsCount: project.wizardSteps?.length
      });
      throw new AppError('Project wizard is not completed', 400, 'WIZARD_INCOMPLETE');
    }

    return project as Project & { wizardData: any; wizardSteps: any[] };
  }

  /**
   * Get generation status and progress
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
      };    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to get generation status', 500, 'GENERATION_STATUS_ERROR');
    }
  }

  /**
   * Get user's generation history
   */
  async getGenerationHistory(userId: string, page: number = 1, pageSize: number = 10): Promise<{
    generations: GenerationResult[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
      totalPages: number;
    };
  }> {
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

      const results: GenerationResult[] = generations.map(gen => ({
        id: gen.id,
        status: gen.status,
        siteUrl: gen.siteUrl || undefined,
        fileSize: gen.fileSize || undefined,
        fileCount: gen.fileCount || undefined,
        generationTime: gen.generationTime || undefined,
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
      };    } catch (error) {
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
      
      if (!await fs.pathExists(filePath)) {
        throw new AppError('Generated site file not found on disk', 404, 'SITE_FILE_MISSING');
      }

      return {
        filePath,
        fileName: `${generation.project.slug}-website.zip`,
        mimeType: 'application/zip',
      };    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to prepare download', 500, 'DOWNLOAD_PREPARATION_ERROR');
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
            in: [SiteGenerationStatus.PENDING, SiteGenerationStatus.GENERATING_CONTENT, SiteGenerationStatus.BUILDING_SITE],
          },
        },
      });

      if (!generation) {
        throw new AppError('Generation not found or cannot be cancelled', 404, 'GENERATION_NOT_CANCELLABLE');
      }

      await this.updateGenerationStatus(generationId, SiteGenerationStatus.FAILED, {
        errorLog: 'Generation cancelled by user',
      });

      return true;    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('Failed to cancel generation', 500, 'GENERATION_CANCEL_ERROR');
    }
  }

  /**
   * Clean up expired generations
   */
  async cleanupExpiredGenerations(): Promise<number> {
    try {
      const expiredGenerations = await this.prisma.siteGeneration.findMany({
        where: {
          expiresAt: {
            lt: new Date(),
          },
          status: SiteGenerationStatus.COMPLETED,
        },
      });

      let cleanedCount = 0;

      for (const generation of expiredGenerations) {
        try {
          if (generation.siteUrl) {
            const filePath = path.join(this.outputDir, generation.siteUrl);
            await fs.remove(filePath);
          }

          await this.prisma.siteGeneration.update({
            where: { id: generation.id },
            data: {
              status: SiteGenerationStatus.EXPIRED,
              siteUrl: null,
            },
          });

          cleanedCount++;
        } catch (error) {
          console.error(`Failed to cleanup generation ${generation.id}:`, error);
        }
      }

      return cleanedCount;    } catch (error) {
      throw new AppError('Failed to cleanup expired generations', 500, 'CLEANUP_ERROR');
    }
  }

  /**
   * Process generation workflow
   */  private async processGeneration(
    generationId: string,
    project: Project & { wizardSteps: any[] },
    options: GenerationOptions & { hugoTheme: string }
  ): Promise<void> {
    const startTime = Date.now();

    try {
      // Step 1: Generate AI Content
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.GENERATING_CONTENT);
      const aiStartTime = Date.now();
      const content = await this.generateAIContent(project, options);
      const aiProcessingTime = Date.now() - aiStartTime;

      // Step 2: Build Hugo Site
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.BUILDING_SITE);
      const buildStartTime = Date.now();
      const siteData = await this.buildHugoSite(generationId, project, content, options);
      const hugoBuildTime = Date.now() - buildStartTime;

      // Step 3: Package Site
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.PACKAGING);
      const packagedSite = await this.packageSite(generationId, siteData);

      // Step 4: Complete
      const totalTime = Date.now() - startTime;
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.COMPLETED, {
        siteUrl: packagedSite.fileName,
        fileSize: packagedSite.fileSize,
        fileCount: packagedSite.fileCount,
        generationTime: totalTime,
        aiProcessingTime,
        hugoBuildTime,
        completedAt: new Date(),
      });

    } catch (error) {      await this.updateGenerationStatus(generationId, SiteGenerationStatus.FAILED, {
        errorLog: error instanceof Error ? error.message : String(error),
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
   * Build Hugo site with generated content
   */  private async buildHugoSite(
    generationId: string,
    project: Project,
    content: any,
    options: GenerationOptions & { hugoTheme: string }
  ): Promise<{ sitePath: string; fileCount: number }> {
    const sitePath = path.join(this.tempDir, generationId);
    
    try {
      // Create Hugo site structure
      await fs.ensureDir(sitePath);
      await fs.ensureDir(path.join(sitePath, 'content'));
      await fs.ensureDir(path.join(sitePath, 'static'));
      await fs.ensureDir(path.join(sitePath, 'themes'));

      // Write Hugo config
      const config = {
        baseURL: '/',
        languageCode: 'en-us',
        title: content.config.title,
        description: content.config.description,
        theme: options.hugoTheme,
        ...options.customizations,
      };

      await fs.writeFile(
        path.join(sitePath, 'hugo.toml'),
        Object.entries(config)
          .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
          .join('\n')
      );

      // Write content pages
      for (const page of content.pages) {
        const frontMatter = {
          title: page.title,
          date: new Date().toISOString(),
        };

        const pageContent = `---\n${Object.entries(frontMatter)
          .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
          .join('\n')}\n---\n\n${page.content}`;

        await fs.writeFile(
          path.join(sitePath, 'content', `${page.name}.md`),
          pageContent
        );
      }

      // Install theme (simplified - in real implementation would clone from GitHub)
      const themePath = path.join(sitePath, 'themes', options.hugoTheme);
      await fs.ensureDir(themePath);
      await fs.writeFile(
        path.join(themePath, 'theme.toml'),
        `name = "${options.hugoTheme}"\nlicense = "MIT"\n`
      );

      // Build site with Hugo (would use actual Hugo CLI in production)
      const publicPath = path.join(sitePath, 'public');
      await fs.ensureDir(publicPath);
      
      // Mock Hugo build - copy content as HTML
      for (const page of content.pages) {
        const htmlContent = `<!DOCTYPE html>
<html>
<head>
    <title>${page.title}</title>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body>
    <h1>${page.title}</h1>
    <div>${page.content.replace(/# /g, '<h1>').replace(/\n\n/g, '</h1><p>').replace(/\n/g, '</p>')}</div>
</body>
</html>`;

        await fs.writeFile(
          path.join(publicPath, page.name === 'index' ? 'index.html' : `${page.name}.html`),
          htmlContent
        );
      }

      // Count files
      const fileCount = await this.countFiles(publicPath);

      return { sitePath: publicPath, fileCount };
    } catch (error) {
      // Cleanup on error
      await fs.remove(sitePath).catch(() => {});
      throw error;
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
   */
  private async countFiles(dirPath: string): Promise<number> {
    let count = 0;
    
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
}

export const websiteGenerationService = new WebsiteGenerationService();
