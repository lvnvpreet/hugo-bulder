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
import * as fsPromises from 'fs/promises';
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
      const project = await this.getProjectWithWizardData(options.projectId, options.userId);      // AUTO-DETECT THEME if enabled or no theme provided
      let selectedTheme = options.hugoTheme;
      let themeExplanation = '';
        if ((!selectedTheme || options.autoDetectTheme) && project.wizardData) {
        console.log('🤖 Auto-detecting theme based on project data...');
        try {
          const recommendation = await this.themeDetector.detectTheme(project.wizardData);
          selectedTheme = recommendation.themeId;
          themeExplanation = this.themeDetector.getThemeExplanation(recommendation);
          
          console.log(`✅ Auto-selected theme: ${selectedTheme} (${recommendation.confidence}% confidence)`);
        } catch (themeError) {
          console.error('❌ Theme detection failed:', themeError);
          console.log('⚠️ Falling back to default theme selection');
          // Continue without theme detection - will use fallback logic below
        }
      }

      // Fallback to default theme if still no theme
      if (!selectedTheme) {
        selectedTheme = 'ananke';
        console.log('⚠️ No theme detected, using default: ananke');
      }      // AUTO-DETECT COLOR SCHEME if not provided
      let colorScheme = options.customizations?.colors;
      if (!colorScheme && project.wizardData) {
        try {
          const detectedColors = this.themeDetector.detectColorScheme(project.wizardData, selectedTheme);
          colorScheme = {
            primary: detectedColors.primary,
            secondary: detectedColors.secondary,
            accent: detectedColors.accent,
            background: detectedColors.background,
            text: detectedColors.text          };
          console.log('✅ Auto-detected color scheme:', colorScheme);
        } catch (colorError) {
          console.error('❌ Color scheme detection failed:', colorError);
          console.log('⚠️ Using default color scheme');
          // Will use default colors from theme
        }
      }

      // Create generation record with detected theme
      const generation = await this.prisma.siteGeneration.create({
        data: {
          projectId: options.projectId,
          status: SiteGenerationStatus.PENDING,
          hugoTheme: selectedTheme,
          startedAt: new Date(),
          expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
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
   * Check if Hugo is installed and accessible
   */
  private async checkHugoInstallation(): Promise<void> {
    try {
      // Check if Hugo is installed and accessible
      await execAsync('hugo version');
    } catch (error) {
      throw new Error('Hugo is not installed or not accessible');
    }
  }

  /**
   * Install Hugo theme
   */
  private async installTheme(siteData: any, options: GenerationOptions & { hugoTheme: string }): Promise<void> {
    const themesDir = path.join(siteData.siteDir, 'themes');
    const themeDir = path.join(themesDir, options.hugoTheme);
    
    try {
      // Create themes directory
      await fsPromises.mkdir(themesDir, { recursive: true });
      
      // Get theme URL from verified themes
      const themeUrl = this.getThemeUrl(options.hugoTheme);
      
      // Clone theme
      await execAsync(`git clone ${themeUrl} ${options.hugoTheme}`, { cwd: themesDir });
      
      // Remove .git directory to avoid conflicts
      const gitDir = path.join(themeDir, '.git');
      try {
        await fsPromises.access(gitDir);
        await fsPromises.rm(gitDir, { recursive: true, force: true });
      } catch (err) {
        // .git directory doesn't exist, no need to remove
      }
      
    } catch (error) {
      throw new Error(`Failed to install theme: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
    /**
   * Get theme URL from theme ID
   */  private getThemeUrl(themeName: string): string {
    const defaultThemeUrl = 'https://github.com/theNewDynamic/gohugo-theme-ananke.git';
    
    const themeUrls = {
      'ananke': 'https://github.com/theNewDynamic/gohugo-theme-ananke.git',
      'papermod': 'https://github.com/adityatelange/hugo-PaperMod.git',
      'bigspring': 'https://github.com/gethugothemes/bigspring-light-hugo.git',
      'restaurant': 'https://github.com/themefisher/restaurant-hugo.git',
      'hargo': 'https://github.com/gethugothemes/hargo-hugo.git',
      'terminal': 'https://github.com/panr/hugo-theme-terminal.git',
      'clarity': 'https://github.com/chipzoller/hugo-clarity.git',
      'mainroad': 'https://github.com/Vimux/Mainroad.git',
    } as const;
    
    const lowerThemeName = themeName.toLowerCase();
    return themeUrls[lowerThemeName as keyof typeof themeUrls] || defaultThemeUrl;
  }

  /**
   * Create a new Hugo site
   */
  private async createHugoSite(
    generationId: string,
    project: Project & { wizardSteps: any[] },
    options: GenerationOptions & { hugoTheme: string }
  ): Promise<any> {
    const siteName = `site-${generationId}`;
    const outputDir = path.join(process.cwd(), 'temp', 'generations', generationId);
    const siteDir = path.join(outputDir, siteName);
    
    try {
      // Create output directory
      await fsPromises.mkdir(outputDir, { recursive: true });
      
      // Create new Hugo site
      await execAsync(`hugo new site ${siteName}`, { cwd: outputDir });
      
      return {
        generationId,
        siteName,
        outputDir,
        siteDir,
        project
      };
    } catch (error) {
      throw new Error(`Failed to create Hugo site: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate AI content and populate files
   */
  private async generateAndPopulateContent(
    siteData: any,
    project: Project & { wizardSteps: any[] },
    options: GenerationOptions & { hugoTheme: string }
  ): Promise<void> {
    const wizardData = project.wizardData as any;
    
    try {
      // Generate AI content for each section
      const selectedSections = wizardData?.websiteStructure?.selectedSections || ['home', 'about', 'services', 'contact'];
      
      for (const section of selectedSections) {
        // Generate AI content for this section
        const aiContent = await this.generateAIContentForSection(section, wizardData, options);
        
        // Populate the corresponding file
        const fileName = section === 'home' ? '_index.md' : `${section}.md`;
        const filePath = path.join(siteData.siteDir, 'content', fileName);
        
        // Read existing file
        let existingContent = await fsPromises.readFile(filePath, 'utf8');
        
        // Append AI content
        existingContent += aiContent;
        
        // Write back to file
        await fsPromises.writeFile(filePath, existingContent);
      }
      
      // Generate and update Hugo config
      await this.generateHugoConfig(siteData, wizardData, options);
      
    } catch (error) {
      throw new Error(`Failed to generate and populate content: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate AI content for a specific section
   */
  private async generateAIContentForSection(
    section: string,
    wizardData: any,
    options: GenerationOptions & { hugoTheme: string }
  ): Promise<string> {
    // This should integrate with your actual AI service
    // For now, returning structured content based on section
    
    const businessName = wizardData?.businessInfo?.name || 'Your Business';
    const businessDescription = wizardData?.businessInfo?.description || 'Professional business services';
    
    switch (section) {
      case 'home':
        return `
# Welcome to ${businessName}

${businessDescription}

## What We Do

We provide exceptional services to help your business grow and succeed.

## Why Choose Us

- Professional expertise
- Quality service
- Customer satisfaction
- Competitive pricing

[Get Started](#contact)
`;
      
      case 'about':
        return `
# About ${businessName}

${businessDescription}

## Our Story

Founded with a vision to provide exceptional services, ${businessName} has been serving clients with dedication and professionalism.

## Our Mission

To deliver outstanding results while maintaining the highest standards of quality and customer service.

## Our Values

- Integrity
- Excellence
- Innovation
- Customer Focus
`;
      
      case 'services':
        return `
# Our Services

We offer a comprehensive range of services designed to meet your needs.

## Service 1
Description of your first service offering.

## Service 2
Description of your second service offering.

## Service 3
Description of your third service offering.

[Contact us](#contact) to learn more about our services.
`;
      
      case 'contact':
        return `
# Contact Us

Get in touch with us today to discuss your needs.

## Contact Information

- **Email:** info@${businessName.toLowerCase().replace(/\s+/g, '')}.com
- **Phone:** (555) 123-4567
- **Address:** 123 Business Street, City, State 12345

## Business Hours

- Monday - Friday: 9:00 AM - 6:00 PM
- Saturday: 10:00 AM - 4:00 PM
- Sunday: Closed

## Contact Form

[Contact form will be implemented based on theme capabilities]
`;
      
      default:
        return `
# ${this.capitalize(section)}

Content for ${section} section will be generated here.
`;
    }
  }

  /**
   * Generate Hugo config file
   */
  private async generateHugoConfig(
    siteData: any, 
    wizardData: any, 
    options: GenerationOptions & { hugoTheme: string }
  ): Promise<void> {
    const businessName = wizardData?.businessInfo?.name || 'Your Business';
    const businessDescription = wizardData?.businessInfo?.description || 'Professional business website';
    
    const config = {
      baseURL: 'https://example.com',
      languageCode: 'en-us',
      title: businessName,
      description: businessDescription,
      theme: options.hugoTheme,
      
      params: {
        description: businessDescription,
        author: businessName,
        ...(wizardData?.themeConfig || {})
      },
      
      menu: {
        main: this.generateMenuFromSections(wizardData?.websiteStructure?.selectedSections || ['home', 'about', 'services', 'contact'])
      },
      
      markup: {
        goldmark: {
          renderer: {
            unsafe: true
          }
        }
      }
    };
    
    const configPath = path.join(siteData.siteDir, 'hugo.yaml');
    await fsPromises.writeFile(configPath, yaml.dump(config));
  }
  
  /**
   * Generate menu items from sections
   */
  private generateMenuFromSections(sections: string[]): Array<{name: string, url: string, weight: number}> {
    return sections.map((section, index) => ({
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
      await fsPromises.mkdir(contentDir, { recursive: true });
      
      // Create static directories
      const staticDir = path.join(siteData.siteDir, 'static');
      const staticSubDirs = ['images', 'css', 'js'];
      
      for (const subDir of staticSubDirs) {
        await fsPromises.mkdir(path.join(staticDir, subDir), { recursive: true });
      }
      
      // Create data directory
      const dataDir = path.join(siteData.siteDir, 'data');
      await fsPromises.mkdir(dataDir, { recursive: true });
      
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
        await fsPromises.writeFile(filePath, frontMatter);
      }
      
    } catch (error) {
      throw new Error(`Failed to create file structure: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  
  /**
   * Capitalize first letter of a string
   */
  private capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  /**
   * Process generation workflow with corrected sequence
   */
  private async processGeneration(
    generationId: string,
    project: Project & { wizardSteps: any[] },
    options: GenerationOptions & { hugoTheme: string }
  ): Promise<void> {
    const startTime = Date.now();

    try {      // Step 1: Check Hugo Installation
      await this.updateGenerationStatus(generationId, 'INITIALIZING' as any);
      await this.checkHugoInstallation();

      // Step 2: Create Hugo Site Structure
      await this.updateGenerationStatus(generationId, 'BUILDING_STRUCTURE' as any);
      const siteData = await this.createHugoSite(generationId, project, options);

      // Step 3: Install Theme
      await this.updateGenerationStatus(generationId, 'APPLYING_THEME' as any);
      await this.installTheme(siteData, options);

      // Step 4: Create File Structure
      await this.updateGenerationStatus(generationId, 'BUILDING_STRUCTURE' as any);
      await this.createFileStructure(siteData, project);

      // Step 5: Generate AI Content and Populate Files
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.GENERATING_CONTENT);
      const aiStartTime = Date.now();
      await this.generateAndPopulateContent(siteData, project, options);
      const aiProcessingTime = Date.now() - aiStartTime;

      // Step 6: Build Hugo Site
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.BUILDING_SITE);
      const buildStartTime = Date.now();
      await this.buildHugoSite(siteData);
      const hugoBuildTime = Date.now() - buildStartTime;

      // Step 7: Package Site
      await this.updateGenerationStatus(generationId, SiteGenerationStatus.PACKAGING);
      const packagedSite = await this.packageSite(generationId, siteData);

      // Step 8: Complete
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
   * Build Hugo site using Hugo CLI
   */  private async buildHugoSite(siteData: any): Promise<{ sitePath: string; fileCount: number }> {
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
